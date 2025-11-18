CREATE TABLE "approved_lenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_request_id" uuid NOT NULL,
	"lender_id" uuid NOT NULL,
	"program_id" uuid,
	"approval_status" text NOT NULL,
	"approval_amount" numeric(12, 2) NOT NULL,
	"apr" numeric(5, 3) NOT NULL,
	"buy_rate" numeric(5, 3) NOT NULL,
	"dealer_reserve" numeric(5, 3) DEFAULT '0.00' NOT NULL,
	"flat_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"term" integer NOT NULL,
	"monthly_payment" numeric(12, 2) NOT NULL,
	"total_finance_charge" numeric(12, 2) NOT NULL,
	"total_of_payments" numeric(12, 2) NOT NULL,
	"ltv" numeric(5, 2) NOT NULL,
	"dti" numeric(5, 2),
	"pti" numeric(5, 2),
	"stipulations" jsonb DEFAULT '[]' NOT NULL,
	"special_conditions" text,
	"approval_score" integer,
	"approval_likelihood" text,
	"incentives" jsonb DEFAULT '[]' NOT NULL,
	"special_rate" boolean DEFAULT false NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"selected_at" timestamp,
	"selected_by" uuid,
	"offer_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"scenario_id" uuid,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_name" text,
	"old_value" text,
	"new_value" text,
	"metadata" jsonb,
	"timestamp" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"field_name" text,
	"old_value" text,
	"new_value" text,
	"description" text,
	"metadata" jsonb,
	"timestamp" timestamp (6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"dealership_id" uuid NOT NULL,
	"content" text NOT NULL,
	"note_type" text DEFAULT 'general' NOT NULL,
	"deal_id" uuid,
	"is_important" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"vin" text,
	"mileage" integer,
	"color" text,
	"notes" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"customer_number" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"date_of_birth" timestamp,
	"drivers_license_number" text,
	"drivers_license_state" text,
	"ssn_last4" text,
	"employer" text,
	"occupation" text,
	"monthly_income" numeric(12, 2),
	"credit_score" integer,
	"preferred_contact_method" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"notes" text,
	"photo_url" text,
	"license_image_url" text,
	"status" text DEFAULT 'prospect' NOT NULL,
	"current_vehicle_year" integer,
	"current_vehicle_make" text,
	"current_vehicle_model" text,
	"current_vehicle_trim" text,
	"current_vehicle_vin" text,
	"current_vehicle_mileage" integer,
	"current_vehicle_color" text,
	"trade_allowance" numeric(12, 2),
	"trade_acv" numeric(12, 2),
	"trade_payoff" numeric(12, 2),
	"trade_payoff_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_customer_number_unique" UNIQUE("customer_number")
);
--> statement-breakpoint
CREATE TABLE "deal_number_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deal_number_sequences_dealership_id_unique" UNIQUE("dealership_id")
);
--> statement-breakpoint
CREATE TABLE "deal_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"trade_vehicle_id" uuid,
	"scenario_type" text NOT NULL,
	"name" text NOT NULL,
	"is_quick_quote" boolean DEFAULT false NOT NULL,
	"vehicle_price" numeric(12, 2) NOT NULL,
	"down_payment" numeric(12, 2) DEFAULT '0' NOT NULL,
	"apr" numeric(6, 4) DEFAULT '0',
	"term" integer DEFAULT 0,
	"money_factor" numeric(8, 6) DEFAULT '0',
	"residual_value" numeric(12, 2) DEFAULT '0',
	"residual_percent" numeric(5, 2) DEFAULT '0',
	"msrp" numeric(12, 2) DEFAULT '0',
	"selling_price" numeric(12, 2) DEFAULT '0',
	"acquisition_fee" numeric(12, 2) DEFAULT '0',
	"acquisition_fee_capitalized" boolean DEFAULT true,
	"doc_fee_capitalized" boolean DEFAULT true,
	"government_fees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cash_down" numeric(12, 2) DEFAULT '0',
	"manufacturer_rebate" numeric(12, 2) DEFAULT '0',
	"other_incentives" numeric(12, 2) DEFAULT '0',
	"trade_allowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"trade_payoff" numeric(12, 2) DEFAULT '0' NOT NULL,
	"dealer_fees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accessories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aftermarket_products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tax_jurisdiction_id" uuid,
	"tax_method" text DEFAULT 'payment',
	"origin_tax_state" text,
	"origin_tax_amount" numeric(12, 2),
	"origin_tax_paid_date" timestamp,
	"total_tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_fees" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_financed" numeric(12, 2) DEFAULT '0' NOT NULL,
	"monthly_payment" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cash_due_at_signing" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_cap_cost" numeric(12, 2) DEFAULT '0',
	"total_cap_reductions" numeric(12, 2) DEFAULT '0',
	"adjusted_cap_cost" numeric(12, 2) DEFAULT '0',
	"depreciation" numeric(12, 2) DEFAULT '0',
	"monthly_depreciation_charge" numeric(12, 2) DEFAULT '0',
	"monthly_rent_charge" numeric(12, 2) DEFAULT '0',
	"base_monthly_payment" numeric(12, 2) DEFAULT '0',
	"monthly_tax" numeric(12, 2) DEFAULT '0',
	"upfront_tax" numeric(12, 2) DEFAULT '0',
	"security_deposit" numeric(12, 2) DEFAULT '0',
	"drive_off_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_of_payments" numeric(12, 2) DEFAULT '0',
	"total_lease_cost" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dealership_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" text DEFAULT 'default' NOT NULL,
	"dealership_name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"phone" text,
	"email" text,
	"website" text,
	"logo" text,
	"primary_color" text DEFAULT '#0066cc',
	"default_tax_rate" numeric(5, 4) DEFAULT '0.0825',
	"doc_fee" numeric(10, 2) DEFAULT '299.00',
	"timezone" text DEFAULT 'America/New_York',
	"currency" text DEFAULT 'USD',
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dealership_settings_dealership_id_unique" UNIQUE("dealership_id")
);
--> statement-breakpoint
CREATE TABLE "dealership_stock_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"prefix" text DEFAULT 'STK' NOT NULL,
	"use_year_prefix" boolean DEFAULT true NOT NULL,
	"padding_length" integer DEFAULT 6 NOT NULL,
	"current_counter" integer DEFAULT 1 NOT NULL,
	"format_preview" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dealership_stock_settings_dealership_id_unique" UNIQUE("dealership_id")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_number" text,
	"dealership_id" uuid NOT NULL,
	"salesperson_id" uuid NOT NULL,
	"sales_manager_id" uuid,
	"finance_manager_id" uuid,
	"customer_id" uuid,
	"vehicle_id" uuid,
	"trade_vehicle_id" uuid,
	"deal_state" text DEFAULT 'DRAFT' NOT NULL,
	"active_scenario_id" uuid,
	"locked_by" uuid,
	"customer_attached_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deals_deal_number_unique" UNIQUE("deal_number")
);
--> statement-breakpoint
CREATE TABLE "email_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_message_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text,
	"storage_key" text,
	"is_inline" boolean DEFAULT false NOT NULL,
	"content_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"icon" text,
	"show_in_sidebar" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_message_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_message_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"is_auto_applied" boolean DEFAULT false NOT NULL,
	"applied_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"user_id" uuid,
	"message_id" text,
	"thread_id" text,
	"in_reply_to" text,
	"from_address" text NOT NULL,
	"from_name" text,
	"to_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_addresses" jsonb DEFAULT '[]'::jsonb,
	"bcc_addresses" jsonb DEFAULT '[]'::jsonb,
	"reply_to" text,
	"subject" text NOT NULL,
	"html_body" text,
	"text_body" text,
	"folder" text DEFAULT 'inbox' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"is_spam" boolean DEFAULT false NOT NULL,
	"spam_score" numeric(5, 2),
	"resend_id" text,
	"resend_status" text,
	"customer_id" uuid,
	"deal_id" uuid,
	"sent_at" timestamp,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "email_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"match_count" integer DEFAULT 0 NOT NULL,
	"last_matched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_package_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'custom' NOT NULL,
	"dealership_id" uuid,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"dealer_fees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accessories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aftermarket_products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lender_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lender_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"min_term" integer DEFAULT 12 NOT NULL,
	"max_term" integer DEFAULT 72 NOT NULL,
	"available_terms" jsonb DEFAULT '[]' NOT NULL,
	"rate_tiers" jsonb DEFAULT '[]' NOT NULL,
	"min_credit_score" integer DEFAULT 580 NOT NULL,
	"max_ltv" numeric(5, 2) DEFAULT '120.00' NOT NULL,
	"max_dti" numeric(5, 2) DEFAULT '45.00' NOT NULL,
	"min_down_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"requirements" jsonb DEFAULT '[]' NOT NULL,
	"incentives" jsonb DEFAULT '[]' NOT NULL,
	"origination_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"max_advance" numeric(12, 2),
	"money_factor" numeric(8, 6),
	"residual_percents" jsonb DEFAULT '{}' NOT NULL,
	"acquisition_fee" numeric(12, 2),
	"active" boolean DEFAULT true NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"expiration_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"type" text NOT NULL,
	"min_credit_score" integer DEFAULT 300 NOT NULL,
	"max_ltv" numeric(5, 2) DEFAULT '125.00' NOT NULL,
	"max_dti" numeric(5, 2) DEFAULT '50.00' NOT NULL,
	"states" jsonb DEFAULT '[]' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"dealer_reserve_max_bps" integer DEFAULT 250 NOT NULL,
	"flat_max_bps" integer DEFAULT 200 NOT NULL,
	"api_endpoint" text,
	"api_key" text,
	"routing_code" text,
	"max_finance_amount" numeric(12, 2),
	"min_finance_amount" numeric(12, 2) DEFAULT '5000.00' NOT NULL,
	"max_term" integer DEFAULT 84 NOT NULL,
	"min_term" integer DEFAULT 12 NOT NULL,
	"new_vehicle_max_age" integer DEFAULT 1 NOT NULL,
	"used_vehicle_max_age" integer DEFAULT 10 NOT NULL,
	"used_vehicle_max_mileage" integer DEFAULT 150000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_code" text NOT NULL,
	"county_name" text,
	"county_fips" text,
	"city_name" text,
	"special_district_name" text,
	"jurisdiction_type" text NOT NULL,
	"tax_rate" numeric(6, 4) NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"notes" text,
	"source_url" text,
	"last_verified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "quick_quote_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quick_quote_id" uuid NOT NULL,
	"customer_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"sms_sent_at" timestamp,
	"sms_delivery_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salesperson_id" uuid,
	"vehicle_id" uuid,
	"quote_payload" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"deal_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"scenario_id" uuid,
	"credit_score" integer NOT NULL,
	"cobuyer_credit_score" integer,
	"requested_amount" numeric(12, 2) NOT NULL,
	"down_payment" numeric(12, 2) NOT NULL,
	"trade_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"trade_payoff" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"term" integer NOT NULL,
	"monthly_income" numeric(12, 2),
	"monthly_debt" numeric(12, 2),
	"calculated_dti" numeric(5, 2),
	"vehicle_data" jsonb NOT NULL,
	"request_type" text DEFAULT 'soft_pull' NOT NULL,
	"request_data" jsonb DEFAULT '{}' NOT NULL,
	"response_data" jsonb DEFAULT '{}' NOT NULL,
	"response_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooftop_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"rooftop_id" text NOT NULL,
	"name" text NOT NULL,
	"dealer_state_code" text NOT NULL,
	"address" text,
	"city" text,
	"zip_code" text,
	"default_tax_perspective" text DEFAULT 'DEALER_STATE' NOT NULL,
	"allowed_registration_states" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state_overrides" jsonb DEFAULT '{}'::jsonb,
	"drive_out_enabled" boolean DEFAULT false NOT NULL,
	"drive_out_states" jsonb DEFAULT '[]'::jsonb,
	"custom_tax_rates" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"username" text,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_jurisdictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_rule_group_id" uuid,
	"state" text NOT NULL,
	"county" text,
	"city" text,
	"township" text,
	"special_district" text,
	"state_tax_rate" numeric(6, 4) NOT NULL,
	"county_tax_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"city_tax_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"township_tax_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"special_district_tax_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"registration_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"title_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"plate_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"doc_fee_max" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rule_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tax_structure" text NOT NULL,
	"doc_fee_taxable" boolean DEFAULT false NOT NULL,
	"warranty_taxable" boolean DEFAULT false NOT NULL,
	"gap_taxable" boolean DEFAULT false NOT NULL,
	"maintenance_taxable" boolean DEFAULT false NOT NULL,
	"accessories_taxable" boolean DEFAULT true NOT NULL,
	"trade_in_credit_type" text DEFAULT 'tax_on_difference' NOT NULL,
	"rebate_taxable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rule_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "trade_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"mileage" integer NOT NULL,
	"vin" text,
	"condition" text,
	"allowance" numeric(12, 2) NOT NULL,
	"payoff" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payoff_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'salesperson' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"reset_token" text,
	"reset_token_expires" timestamp,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"last_login" timestamp,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"account_locked_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_comparables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"mileage" integer NOT NULL,
	"condition" text,
	"sale_price" numeric(12, 2),
	"list_price" numeric(12, 2),
	"sale_date" timestamp,
	"days_on_market" integer,
	"city" text,
	"state" text,
	"zip_code" text,
	"distance_miles" integer,
	"similarity_score" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_standard" boolean DEFAULT true NOT NULL,
	"package_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"url" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"valuation_type" text NOT NULL,
	"base_value" numeric(12, 2),
	"adjusted_value" numeric(12, 2),
	"low_range" numeric(12, 2),
	"high_range" numeric(12, 2),
	"condition_grade" text,
	"mileage_adjustment" numeric(12, 2),
	"region_adjustment" numeric(12, 2),
	"provider_data" jsonb DEFAULT '{}'::jsonb,
	"valuation_date" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealership_id" uuid NOT NULL,
	"stock_number" text,
	"vin" text NOT NULL,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"mileage" integer NOT NULL,
	"exterior_color" text,
	"interior_color" text,
	"engine_type" text,
	"transmission" text,
	"drivetrain" text,
	"fuel_type" text,
	"mpg_city" integer,
	"mpg_highway" integer,
	"price" numeric(12, 2) NOT NULL,
	"msrp" numeric(12, 2),
	"invoice_price" numeric(12, 2),
	"internet_price" numeric(12, 2),
	"condition" text DEFAULT 'new' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"images" jsonb DEFAULT '[]' NOT NULL,
	"features" jsonb DEFAULT '[]' NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_vin_unique" UNIQUE("vin")
);
--> statement-breakpoint
CREATE TABLE "zip_code_lookup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zip_code" text NOT NULL,
	"tax_jurisdiction_id" uuid NOT NULL,
	"city" text,
	"state" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "zip_code_lookup_zip_code_unique" UNIQUE("zip_code")
);
--> statement-breakpoint
CREATE TABLE "zip_to_local_tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zip_code" text NOT NULL,
	"state_code" text NOT NULL,
	"county_fips" text,
	"county_name" text NOT NULL,
	"city_name" text,
	"tax_rate_ids" jsonb DEFAULT '[]' NOT NULL,
	"combined_local_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approved_lenders" ADD CONSTRAINT "approved_lenders_rate_request_id_rate_requests_id_fk" FOREIGN KEY ("rate_request_id") REFERENCES "public"."rate_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_lenders" ADD CONSTRAINT "approved_lenders_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_lenders" ADD CONSTRAINT "approved_lenders_program_id_lender_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."lender_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_lenders" ADD CONSTRAINT "approved_lenders_selected_by_users_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_scenario_id_deal_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."deal_scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_vehicles" ADD CONSTRAINT "customer_vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_scenarios" ADD CONSTRAINT "deal_scenarios_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_scenarios" ADD CONSTRAINT "deal_scenarios_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_scenarios" ADD CONSTRAINT "deal_scenarios_tax_jurisdiction_id_tax_jurisdictions_id_fk" FOREIGN KEY ("tax_jurisdiction_id") REFERENCES "public"."tax_jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealership_stock_settings" ADD CONSTRAINT "dealership_stock_settings_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_sales_manager_id_users_id_fk" FOREIGN KEY ("sales_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_finance_manager_id_users_id_fk" FOREIGN KEY ("finance_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_trade_vehicle_id_trade_vehicles_id_fk" FOREIGN KEY ("trade_vehicle_id") REFERENCES "public"."trade_vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_email_message_id_email_messages_id_fk" FOREIGN KEY ("email_message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message_labels" ADD CONSTRAINT "email_message_labels_email_message_id_email_messages_id_fk" FOREIGN KEY ("email_message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message_labels" ADD CONSTRAINT "email_message_labels_label_id_email_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."email_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message_labels" ADD CONSTRAINT "email_message_labels_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rules" ADD CONSTRAINT "email_rules_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rules" ADD CONSTRAINT "email_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_package_templates" ADD CONSTRAINT "fee_package_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_package_templates" ADD CONSTRAINT "fee_package_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_programs" ADD CONSTRAINT "lender_programs_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_quote_contacts" ADD CONSTRAINT "quick_quote_contacts_quick_quote_id_quick_quotes_id_fk" FOREIGN KEY ("quick_quote_id") REFERENCES "public"."quick_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_quote_contacts" ADD CONSTRAINT "quick_quote_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_quotes" ADD CONSTRAINT "quick_quotes_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_quotes" ADD CONSTRAINT "quick_quotes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_quotes" ADD CONSTRAINT "quick_quotes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_requests" ADD CONSTRAINT "rate_requests_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_requests" ADD CONSTRAINT "rate_requests_scenario_id_deal_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."deal_scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_requests" ADD CONSTRAINT "rate_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooftop_configurations" ADD CONSTRAINT "rooftop_configurations_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_log" ADD CONSTRAINT "security_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_jurisdictions" ADD CONSTRAINT "tax_jurisdictions_tax_rule_group_id_tax_rule_groups_id_fk" FOREIGN KEY ("tax_rule_group_id") REFERENCES "public"."tax_rule_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_comparables" ADD CONSTRAINT "vehicle_comparables_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_features" ADD CONSTRAINT "vehicle_features_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_valuations" ADD CONSTRAINT "vehicle_valuations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealership_id_dealership_settings_id_fk" FOREIGN KEY ("dealership_id") REFERENCES "public"."dealership_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zip_code_lookup" ADD CONSTRAINT "zip_code_lookup_tax_jurisdiction_id_tax_jurisdictions_id_fk" FOREIGN KEY ("tax_jurisdiction_id") REFERENCES "public"."tax_jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approved_lenders_rate_request_idx" ON "approved_lenders" USING btree ("rate_request_id");--> statement-breakpoint
CREATE INDEX "approved_lenders_lender_idx" ON "approved_lenders" USING btree ("lender_id");--> statement-breakpoint
CREATE INDEX "approved_lenders_selected_idx" ON "approved_lenders" USING btree ("selected");--> statement-breakpoint
CREATE INDEX "approved_lenders_apr_idx" ON "approved_lenders" USING btree ("apr");--> statement-breakpoint
CREATE INDEX "audit_log_deal_idx" ON "audit_log" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_history_customer_idx" ON "customer_history" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_history_timestamp_idx" ON "customer_history" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "customer_history_user_idx" ON "customer_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_notes_customer_idx" ON "customer_notes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_notes_user_idx" ON "customer_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_notes_dealership_idx" ON "customer_notes" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "customer_notes_created_at_idx" ON "customer_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customer_vehicles_customer_idx" ON "customer_vehicles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "customers_number_idx" ON "customers" USING btree ("customer_number");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_number_sequences_dealership_idx" ON "deal_number_sequences" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "deal_scenarios_deal_idx" ON "deal_scenarios" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "dealership_stock_settings_dealership_idx" ON "dealership_stock_settings" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "deals_deal_number_idx" ON "deals" USING btree ("deal_number");--> statement-breakpoint
CREATE INDEX "deals_customer_idx" ON "deals" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "deals_state_idx" ON "deals" USING btree ("deal_state");--> statement-breakpoint
CREATE INDEX "email_attachments_email_idx" ON "email_attachments" USING btree ("email_message_id");--> statement-breakpoint
CREATE INDEX "email_folders_user_idx" ON "email_folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_folders_dealership_idx" ON "email_folders" USING btree ("dealership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_folders_user_slug_idx" ON "email_folders" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "email_labels_dealership_idx" ON "email_labels" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "email_labels_user_idx" ON "email_labels" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_labels_unique_idx" ON "email_labels" USING btree ("dealership_id","user_id","name");--> statement-breakpoint
CREATE INDEX "email_message_labels_email_idx" ON "email_message_labels" USING btree ("email_message_id");--> statement-breakpoint
CREATE INDEX "email_message_labels_label_idx" ON "email_message_labels" USING btree ("label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_message_labels_unique_idx" ON "email_message_labels" USING btree ("email_message_id","label_id");--> statement-breakpoint
CREATE INDEX "email_messages_dealership_idx" ON "email_messages" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "email_messages_user_idx" ON "email_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_messages_folder_idx" ON "email_messages" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "email_messages_thread_idx" ON "email_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "email_messages_customer_idx" ON "email_messages" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "email_messages_deal_idx" ON "email_messages" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "email_messages_sent_at_idx" ON "email_messages" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "email_rules_dealership_idx" ON "email_rules" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "email_rules_user_idx" ON "email_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_rules_priority_idx" ON "email_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "email_rules_active_idx" ON "email_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "fee_package_templates_category_idx" ON "fee_package_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fee_package_templates_active_idx" ON "fee_package_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "fee_package_templates_dealership_idx" ON "fee_package_templates" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "fee_package_templates_display_order_idx" ON "fee_package_templates" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "fee_package_templates_created_by_idx" ON "fee_package_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "lender_programs_lender_idx" ON "lender_programs" USING btree ("lender_id");--> statement-breakpoint
CREATE INDEX "lender_programs_type_idx" ON "lender_programs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "lender_programs_active_idx" ON "lender_programs" USING btree ("active");--> statement-breakpoint
CREATE INDEX "lenders_type_idx" ON "lenders" USING btree ("type");--> statement-breakpoint
CREATE INDEX "lenders_active_idx" ON "lenders" USING btree ("active");--> statement-breakpoint
CREATE INDEX "lenders_name_idx" ON "lenders" USING btree ("name");--> statement-breakpoint
CREATE INDEX "local_tax_rates_state_county_city_idx" ON "local_tax_rates" USING btree ("state_code","county_name","city_name");--> statement-breakpoint
CREATE INDEX "local_tax_rates_state_idx" ON "local_tax_rates" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "local_tax_rates_jurisdiction_type_idx" ON "local_tax_rates" USING btree ("jurisdiction_type");--> statement-breakpoint
CREATE INDEX "local_tax_rates_effective_date_idx" ON "local_tax_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "local_tax_rates_active_idx" ON "local_tax_rates" USING btree ("state_code","end_date");--> statement-breakpoint
CREATE INDEX "permissions_category_idx" ON "permissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "quick_quote_contacts_quote_idx" ON "quick_quote_contacts" USING btree ("quick_quote_id");--> statement-breakpoint
CREATE INDEX "quick_quote_contacts_phone_idx" ON "quick_quote_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "quick_quotes_salesperson_idx" ON "quick_quotes" USING btree ("salesperson_id");--> statement-breakpoint
CREATE INDEX "quick_quotes_status_idx" ON "quick_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quick_quotes_vehicle_idx" ON "quick_quotes" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "rate_requests_deal_idx" ON "rate_requests" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "rate_requests_status_idx" ON "rate_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rate_requests_created_at_idx" ON "rate_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "role_permissions_role_permission_idx" ON "role_permissions" USING btree ("role","permission_id");--> statement-breakpoint
CREATE INDEX "rooftop_dealership_idx" ON "rooftop_configurations" USING btree ("dealership_id");--> statement-breakpoint
CREATE INDEX "rooftop_rooftop_id_idx" ON "rooftop_configurations" USING btree ("rooftop_id");--> statement-breakpoint
CREATE INDEX "rooftop_unique_idx" ON "rooftop_configurations" USING btree ("dealership_id","rooftop_id");--> statement-breakpoint
CREATE INDEX "security_audit_log_user_id_idx" ON "security_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audit_log_event_type_idx" ON "security_audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_audit_log_category_idx" ON "security_audit_log" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "security_audit_log_created_at_idx" ON "security_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tax_jurisdictions_state_idx" ON "tax_jurisdictions" USING btree ("state","county","city");--> statement-breakpoint
CREATE INDEX "tax_jurisdictions_rule_group_idx" ON "tax_jurisdictions" USING btree ("tax_rule_group_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "vehicle_comparables_vehicle_idx" ON "vehicle_comparables" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_comparables_source_idx" ON "vehicle_comparables" USING btree ("source");--> statement-breakpoint
CREATE INDEX "vehicle_comparables_sale_date_idx" ON "vehicle_comparables" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "vehicle_features_vehicle_idx" ON "vehicle_features" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_features_category_idx" ON "vehicle_features" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vehicle_images_vehicle_idx" ON "vehicle_images" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_images_primary_idx" ON "vehicle_images" USING btree ("vehicle_id","is_primary");--> statement-breakpoint
CREATE INDEX "vehicle_valuations_vehicle_provider_idx" ON "vehicle_valuations" USING btree ("vehicle_id","provider");--> statement-breakpoint
CREATE INDEX "vehicle_valuations_provider_idx" ON "vehicle_valuations" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_dealership_stock_idx" ON "vehicles" USING btree ("dealership_id","stock_number");--> statement-breakpoint
CREATE INDEX "vehicles_dealership_vin_idx" ON "vehicles" USING btree ("dealership_id","vin");--> statement-breakpoint
CREATE INDEX "vehicles_stock_idx" ON "vehicles" USING btree ("stock_number");--> statement-breakpoint
CREATE INDEX "vehicles_vin_idx" ON "vehicles" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "vehicles_make_model_idx" ON "vehicles" USING btree ("make","model");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vehicles_condition_idx" ON "vehicles" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "vehicles_year_idx" ON "vehicles" USING btree ("year");--> statement-breakpoint
CREATE INDEX "vehicles_price_idx" ON "vehicles" USING btree ("price");--> statement-breakpoint
CREATE INDEX "zip_code_lookup_zip_idx" ON "zip_code_lookup" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "zip_code_lookup_state_idx" ON "zip_code_lookup" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "zip_to_local_tax_rates_zip_code_unique" ON "zip_to_local_tax_rates" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "zip_to_local_tax_rates_zip_code_idx" ON "zip_to_local_tax_rates" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "zip_to_local_tax_rates_state_idx" ON "zip_to_local_tax_rates" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "zip_to_local_tax_rates_county_idx" ON "zip_to_local_tax_rates" USING btree ("county_fips");