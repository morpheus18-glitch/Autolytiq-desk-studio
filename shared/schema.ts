// Referenced from javascript_database blueprint integration
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, uuid, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ===== USERS TABLE =====
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("salesperson"), // salesperson, sales_manager, finance_manager, admin
  
  // Email verification
  emailVerified: boolean("email_verified").notNull().default(false),
  
  // Password reset
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  
  // Two-factor authentication
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  
  // Security & activity tracking
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  accountLockedUntil: timestamp("account_locked_until"),
  
  // User preferences (theme, notifications, default views, etc.)
  preferences: jsonb("preferences").default({}),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  emailVerified: true,
  failedLoginAttempts: true,
  mfaEnabled: true,
  // Note: role IS included in insertUserSchema for internal/admin use
  // but is NOT included in registerSchema (public) to prevent privilege escalation
});

// Login schema (username/email + password)
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Registration schema with password validation - role is NOT included (defaults to salesperson)
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// ===== CUSTOMERS TABLE =====
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerNumber: text("customer_number").unique(), // Auto-generated identifier (e.g., "C-001234"), nullable until generation logic deployed
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  
  // Additional fields for expanded customer view
  dateOfBirth: timestamp("date_of_birth"),
  driversLicenseNumber: text("drivers_license_number"), // TODO: Encrypt at rest before production
  driversLicenseState: text("drivers_license_state"),
  ssnLast4: text("ssn_last4"), // Last 4 digits only - TODO: Encrypt at rest, implement access controls
  employer: text("employer"),
  occupation: text("occupation"),
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }),
  creditScore: integer("credit_score"),
  
  // Marketing preferences
  preferredContactMethod: text("preferred_contact_method"), // email, phone, sms
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("customers_name_idx").on(table.firstName, table.lastName),
  customerNumberIdx: index("customers_number_idx").on(table.customerNumber),
  emailIdx: index("customers_email_idx").on(table.email),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true, 
  customerNumber: true, // Auto-generated
  createdAt: true, 
  updatedAt: true 
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ===== VEHICLES TABLE =====
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  stockNumber: text("stock_number").unique(), // Configurable format (e.g., "STK-2024-001234"), nullable until generation logic deployed
  vin: text("vin").notNull().unique(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  mileage: integer("mileage").notNull(),
  
  // Colors
  exteriorColor: text("exterior_color"),
  interiorColor: text("interior_color"),
  
  // Engine & Drivetrain
  engineType: text("engine_type"), // e.g., "3.5L V6", "2.0L Turbo I4"
  transmission: text("transmission"), // e.g., "Automatic", "Manual", "CVT"
  drivetrain: text("drivetrain"), // e.g., "FWD", "RWD", "AWD", "4WD"
  fuelType: text("fuel_type"), // e.g., "Gasoline", "Hybrid", "Electric", "Diesel"
  
  // Fuel Economy
  mpgCity: integer("mpg_city"),
  mpgHighway: integer("mpg_highway"),
  
  // Pricing
  price: decimal("price", { precision: 12, scale: 2 }).notNull(), // Selling price
  msrp: decimal("msrp", { precision: 12, scale: 2 }),
  invoicePrice: decimal("invoice_price", { precision: 12, scale: 2 }),
  internetPrice: decimal("internet_price", { precision: 12, scale: 2 }), // Online advertised price
  
  // Condition & Status
  condition: text("condition").notNull().default("new"), // "new", "used", "certified"
  status: text("status").notNull().default("available"), // "available", "hold", "sold", "in_transit"
  
  // Arrays stored as JSONB
  images: jsonb("images").notNull().default('[]'), // Array of image URLs
  features: jsonb("features").notNull().default('[]'), // Array of features/options
  
  // Legacy field for compatibility
  isNew: boolean("is_new").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  stockIdx: index("vehicles_stock_idx").on(table.stockNumber),
  vinIdx: index("vehicles_vin_idx").on(table.vin),
  makeModelIdx: index("vehicles_make_model_idx").on(table.make, table.model),
  statusIdx: index("vehicles_status_idx").on(table.status),
  conditionIdx: index("vehicles_condition_idx").on(table.condition),
  yearIdx: index("vehicles_year_idx").on(table.year),
  priceIdx: index("vehicles_price_idx").on(table.price),
}));

// ===== VEHICLE IMAGES TABLE =====
export const vehicleImages = pgTable("vehicle_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  vehicleIdx: index("vehicle_images_vehicle_idx").on(table.vehicleId),
  primaryIdx: index("vehicle_images_primary_idx").on(table.vehicleId, table.isPrimary),
}));

// ===== VEHICLE FEATURES TABLE =====
export const vehicleFeatures = pgTable("vehicle_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // e.g., "Safety", "Technology", "Comfort", "Performance"
  name: text("name").notNull(), // e.g., "Blind Spot Monitoring", "Apple CarPlay"
  description: text("description"),
  isStandard: boolean("is_standard").notNull().default(true), // Standard vs Optional
  packageName: text("package_name"), // If part of a package
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  vehicleIdx: index("vehicle_features_vehicle_idx").on(table.vehicleId),
  categoryIdx: index("vehicle_features_category_idx").on(table.category),
}));

// Schema types
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, stockNumber: true, createdAt: true, updatedAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

export const insertVehicleImageSchema = createInsertSchema(vehicleImages).omit({ id: true, createdAt: true });
export type InsertVehicleImage = z.infer<typeof insertVehicleImageSchema>;
export type VehicleImage = typeof vehicleImages.$inferSelect;

export const insertVehicleFeatureSchema = createInsertSchema(vehicleFeatures).omit({ id: true, createdAt: true });
export type InsertVehicleFeature = z.infer<typeof insertVehicleFeatureSchema>;
export type VehicleFeature = typeof vehicleFeatures.$inferSelect;

// ===== TRADE VEHICLES TABLE =====
export const tradeVehicles = pgTable("trade_vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  mileage: integer("mileage").notNull(),
  vin: text("vin"),
  condition: text("condition"), // excellent, good, fair, poor
  allowance: decimal("allowance", { precision: 12, scale: 2 }).notNull(),
  payoff: decimal("payoff", { precision: 12, scale: 2 }).notNull().default("0"),
  payoffTo: text("payoff_to"), // Lender/bank that receives the payoff
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeVehicleSchema = createInsertSchema(tradeVehicles).omit({ id: true, createdAt: true });
export type InsertTradeVehicle = z.infer<typeof insertTradeVehicleSchema>;
export type TradeVehicle = typeof tradeVehicles.$inferSelect;

// ===== TAX RULE GROUPS TABLE =====
// Groups states by similar tax characteristics for efficient categorization
export const taxRuleGroups = pgTable("tax_rule_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // e.g., "Flat State Tax", "Variable County Tax", "No Doc Fee Tax", etc.
  description: text("description"),
  
  // Tax structure characteristics
  taxStructure: text("tax_structure").notNull(), // flat_state, variable_county_city, origin_based, destination_based
  
  // What gets taxed?
  docFeeTaxable: boolean("doc_fee_taxable").notNull().default(false),
  warrantyTaxable: boolean("warranty_taxable").notNull().default(false),
  gapTaxable: boolean("gap_taxable").notNull().default(false),
  maintenanceTaxable: boolean("maintenance_taxable").notNull().default(false),
  accessoriesTaxable: boolean("accessories_taxable").notNull().default(true),
  
  // Trade-in handling
  tradeInCreditType: text("trade_in_credit_type").notNull().default("tax_on_difference"), // none, full_credit, tax_on_difference
  
  // Rebate taxation
  rebateTaxable: boolean("rebate_taxable").notNull().default(false), // Some states tax rebates, some don't
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaxRuleGroupSchema = createInsertSchema(taxRuleGroups).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxRuleGroup = z.infer<typeof insertTaxRuleGroupSchema>;
export type TaxRuleGroup = typeof taxRuleGroups.$inferSelect;

// ===== TAX JURISDICTIONS TABLE =====
export const taxJurisdictions = pgTable("tax_jurisdictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Link to tax rule group for shared characteristics
  taxRuleGroupId: uuid("tax_rule_group_id").references(() => taxRuleGroups.id),
  
  // Geographic identifiers
  state: text("state").notNull(),
  county: text("county"),
  city: text("city"),
  township: text("township"),
  specialDistrict: text("special_district"),
  
  // Tax rates
  stateTaxRate: decimal("state_tax_rate", { precision: 6, scale: 4 }).notNull(),
  countyTaxRate: decimal("county_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  cityTaxRate: decimal("city_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  townshipTaxRate: decimal("township_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  specialDistrictTaxRate: decimal("special_district_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  
  // Government fees
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  titleFee: decimal("title_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  plateFee: decimal("plate_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  docFeeMax: decimal("doc_fee_max", { precision: 10, scale: 2 }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  stateIdx: index("tax_jurisdictions_state_idx").on(table.state, table.county, table.city),
  ruleGroupIdx: index("tax_jurisdictions_rule_group_idx").on(table.taxRuleGroupId),
}));

// ===== ZIP CODE TO JURISDICTION LOOKUP TABLE =====
// Fast lookup table: zip code -> jurisdiction
export const zipCodeLookup = pgTable("zip_code_lookup", {
  id: uuid("id").primaryKey().defaultRandom(),
  zipCode: text("zip_code").notNull().unique(),
  taxJurisdictionId: uuid("tax_jurisdiction_id").notNull().references(() => taxJurisdictions.id),
  city: text("city"), // For display purposes
  state: text("state").notNull(), // For quick filtering
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  zipIdx: index("zip_code_lookup_zip_idx").on(table.zipCode),
  stateIdx: index("zip_code_lookup_state_idx").on(table.state),
}));

export const insertZipCodeLookupSchema = createInsertSchema(zipCodeLookup).omit({ id: true, createdAt: true });
export type InsertZipCodeLookup = z.infer<typeof insertZipCodeLookupSchema>;
export type ZipCodeLookup = typeof zipCodeLookup.$inferSelect;

export const insertTaxJurisdictionSchema = createInsertSchema(taxJurisdictions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxJurisdiction = z.infer<typeof insertTaxJurisdictionSchema>;
export type TaxJurisdiction = typeof taxJurisdictions.$inferSelect;

// ===== QUICK QUOTES TABLE =====
// Stores Quick Quote wizard results for audit, SMS retry, and conversion tracking
export const quickQuotes = pgTable("quick_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  salespersonId: uuid("salesperson_id").references(() => users.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  quotePayload: jsonb("quote_payload").notNull(), // Complete quote data: payment, terms, trade, etc.
  status: text("status").notNull().default("draft"), // draft, sent, converted
  dealId: uuid("deal_id").references(() => deals.id), // Set when converted to full deal
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  salespersonIdx: index("quick_quotes_salesperson_idx").on(table.salespersonId),
  statusIdx: index("quick_quotes_status_idx").on(table.status),
  vehicleIdx: index("quick_quotes_vehicle_idx").on(table.vehicleId),
}));

export const insertQuickQuoteSchema = createInsertSchema(quickQuotes).omit({ id: true, createdAt: true });
export type InsertQuickQuote = z.infer<typeof insertQuickQuoteSchema>;
export type QuickQuote = typeof quickQuotes.$inferSelect;

// ===== QUICK QUOTE CONTACTS TABLE =====
// Stores customer contact info for SMS quote delivery
export const quickQuoteContacts = pgTable("quick_quote_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quickQuoteId: uuid("quick_quote_id").notNull().references(() => quickQuotes.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id), // Linked customer if known
  name: text("name").notNull(),
  phone: text("phone").notNull(), // E.164 format
  smsSentAt: timestamp("sms_sent_at"),
  smsDeliveryStatus: text("sms_delivery_status"), // pending, delivered, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  quickQuoteIdx: index("quick_quote_contacts_quote_idx").on(table.quickQuoteId),
  phoneIdx: index("quick_quote_contacts_phone_idx").on(table.phone),
}));

export const insertQuickQuoteContactSchema = createInsertSchema(quickQuoteContacts).omit({ id: true, createdAt: true });
export type InsertQuickQuoteContact = z.infer<typeof insertQuickQuoteContactSchema>;
export type QuickQuoteContact = typeof quickQuoteContacts.$inferSelect;

// ===== DEALS TABLE =====
export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealNumber: text("deal_number").unique(), // Nullable until customer is attached - then auto-generated as 4-digit#Glyph
  dealershipId: uuid("dealership_id").notNull().default(sql`gen_random_uuid()`),
  salespersonId: uuid("salesperson_id").notNull().references(() => users.id),
  salesManagerId: uuid("sales_manager_id").references(() => users.id),
  financeManagerId: uuid("finance_manager_id").references(() => users.id),
  customerId: uuid("customer_id").references(() => customers.id),  // Made nullable for blank desking
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),  // Already nullable for blank desking
  tradeVehicleId: uuid("trade_vehicle_id").references(() => tradeVehicles.id),
  dealState: text("deal_state").notNull().default("DRAFT"), // DRAFT, IN_PROGRESS, APPROVED, CANCELLED
  activeScenarioId: uuid("active_scenario_id"),
  lockedBy: uuid("locked_by").references(() => users.id),
  customerAttachedAt: timestamp("customer_attached_at"), // Timestamp when customer first attached and deal number generated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dealNumberIdx: index("deals_deal_number_idx").on(table.dealNumber),
  customerIdx: index("deals_customer_idx").on(table.customerId),
  stateIdx: index("deals_state_idx").on(table.dealState),
}));

export const insertDealSchema = createInsertSchema(deals).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  dealNumber: true,
  dealershipId: true,
  lockedBy: true,
  activeScenarioId: true
});
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// ===== DEAL SCENARIOS TABLE =====
export const dealScenarios = pgTable("deal_scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id), // Each scenario can reference a different vehicle
  tradeVehicleId: uuid("trade_vehicle_id"), // Each scenario can reference a specific trade vehicle
  scenarioType: text("scenario_type").notNull(), // CASH_DEAL, FINANCE_DEAL, LEASE_DEAL
  name: text("name").notNull(),
  
  // Quick Quote Mode - flag for streamlined 30-45 second quotes
  isQuickQuote: boolean("is_quick_quote").notNull().default(false),
  
  // Vehicle pricing
  vehiclePrice: decimal("vehicle_price", { precision: 12, scale: 2 }).notNull(),
  downPayment: decimal("down_payment", { precision: 12, scale: 2 }).notNull().default("0"),
  
  // Finance specific
  apr: decimal("apr", { precision: 6, scale: 4 }).default("0"),
  term: integer("term").default(0), // months
  
  // Lease specific
  moneyFactor: decimal("money_factor", { precision: 8, scale: 6 }).default("0"),
  residualValue: decimal("residual_value", { precision: 12, scale: 2 }).default("0"),
  residualPercent: decimal("residual_percent", { precision: 5, scale: 2 }).default("0"),
  
  // Trade-in
  tradeAllowance: decimal("trade_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  tradePayoff: decimal("trade_payoff", { precision: 12, scale: 2 }).notNull().default("0"),
  
  // Fees and accessories (stored as JSONB array)
  dealerFees: jsonb("dealer_fees").notNull().default([]), // [{name: string, amount: number, taxable: boolean}]
  accessories: jsonb("accessories").notNull().default([]), // [{name: string, amount: number, taxable: boolean}]
  aftermarketProducts: jsonb("aftermarket_products").notNull().default([]), // F&I products and physical add-ons
  
  // Tax jurisdiction
  taxJurisdictionId: uuid("tax_jurisdiction_id").references(() => taxJurisdictions.id),
  
  // Calculated values (stored for performance)
  totalTax: decimal("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  totalFees: decimal("total_fees", { precision: 12, scale: 2 }).notNull().default("0"),
  amountFinanced: decimal("amount_financed", { precision: 12, scale: 2 }).notNull().default("0"),
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  cashDueAtSigning: decimal("cash_due_at_signing", { precision: 12, scale: 2 }).notNull().default("0"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dealIdx: index("deal_scenarios_deal_idx").on(table.dealId),
}));

export const insertDealScenarioSchema = createInsertSchema(dealScenarios).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertDealScenario = z.infer<typeof insertDealScenarioSchema>;
export type DealScenario = typeof dealScenarios.$inferSelect;

// ===== AUDIT LOG TABLE =====
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
  scenarioId: uuid("scenario_id").references(() => dealScenarios.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // create, update, delete, state_change
  entityType: text("entity_type").notNull(), // deal, scenario, customer, vehicle
  entityId: uuid("entity_id").notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  metadata: jsonb("metadata"), // Additional context as JSON
  timestamp: timestamp("timestamp", { precision: 6 }).notNull().defaultNow(), // microsecond precision
}, (table) => ({
  dealIdx: index("audit_log_deal_idx").on(table.dealId),
  timestampIdx: index("audit_log_timestamp_idx").on(table.timestamp),
  userIdx: index("audit_log_user_idx").on(table.userId),
}));

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, timestamp: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// ===== LENDERS TABLE =====
export const lenders = pgTable("lenders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logo: text("logo"), // URL to logo image
  type: text("type").notNull(), // prime, captive, credit_union, subprime, bhph
  minCreditScore: integer("min_credit_score").notNull().default(300),
  maxLtv: decimal("max_ltv", { precision: 5, scale: 2 }).notNull().default("125.00"), // Maximum loan-to-value ratio
  maxDti: decimal("max_dti", { precision: 5, scale: 2 }).notNull().default("50.00"), // Maximum debt-to-income ratio
  states: jsonb("states").notNull().default('[]'), // Array of state codes where lender operates
  active: boolean("active").notNull().default(true),
  dealerReserveMaxBps: integer("dealer_reserve_max_bps").notNull().default(250), // Max dealer reserve in basis points
  flatMaxBps: integer("flat_max_bps").notNull().default(200), // Max flat fee in basis points
  
  // Integration settings
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  routingCode: text("routing_code"), // RouteOne, Dealertrack, etc.
  
  // Business rules
  maxFinanceAmount: decimal("max_finance_amount", { precision: 12, scale: 2 }),
  minFinanceAmount: decimal("min_finance_amount", { precision: 12, scale: 2 }).notNull().default("5000.00"),
  maxTerm: integer("max_term").notNull().default(84), // Maximum term in months
  minTerm: integer("min_term").notNull().default(12),
  newVehicleMaxAge: integer("new_vehicle_max_age").notNull().default(1), // Years
  usedVehicleMaxAge: integer("used_vehicle_max_age").notNull().default(10), // Years
  usedVehicleMaxMileage: integer("used_vehicle_max_mileage").notNull().default(150000),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  typeIdx: index("lenders_type_idx").on(table.type),
  activeIdx: index("lenders_active_idx").on(table.active),
  nameIdx: index("lenders_name_idx").on(table.name),
}));

export const insertLenderSchema = createInsertSchema(lenders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLender = z.infer<typeof insertLenderSchema>;
export type Lender = typeof lenders.$inferSelect;

// ===== LENDER PROGRAMS TABLE =====
export const lenderPrograms = pgTable("lender_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  lenderId: uuid("lender_id").notNull().references(() => lenders.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "New Auto Standard", "Used Auto Preferred", "Lease Special"
  type: text("type").notNull(), // retail, lease, balloon, promotional
  vehicleType: text("vehicle_type").notNull(), // new, used, certified
  
  // Term configuration
  minTerm: integer("min_term").notNull().default(12),
  maxTerm: integer("max_term").notNull().default(72),
  availableTerms: jsonb("available_terms").notNull().default('[]'), // [36, 48, 60, 72]
  
  // Rate tiers based on credit score
  rateTiers: jsonb("rate_tiers").notNull().default('[]'), // Array of {minScore, maxScore, apr, buyRate}
  
  // Requirements
  minCreditScore: integer("min_credit_score").notNull().default(580),
  maxLtv: decimal("max_ltv", { precision: 5, scale: 2 }).notNull().default("120.00"),
  maxDti: decimal("max_dti", { precision: 5, scale: 2 }).notNull().default("45.00"),
  minDownPercent: decimal("min_down_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  
  // Special conditions
  requirements: jsonb("requirements").notNull().default('[]'), // Array of requirement strings
  incentives: jsonb("incentives").notNull().default('[]'), // Current promotional rates or cash back
  
  // Fees
  originationFee: decimal("origination_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  maxAdvance: decimal("max_advance", { precision: 12, scale: 2 }), // Maximum amount to finance
  
  // Lease-specific (if applicable)
  moneyFactor: decimal("money_factor", { precision: 8, scale: 6 }), // For lease calculations
  residualPercents: jsonb("residual_percents").notNull().default('{}'), // {36: 0.58, 48: 0.45, ...}
  acquisitionFee: decimal("acquisition_fee", { precision: 12, scale: 2 }),
  
  active: boolean("active").notNull().default(true),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  expirationDate: timestamp("expiration_date"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  lenderIdx: index("lender_programs_lender_idx").on(table.lenderId),
  typeIdx: index("lender_programs_type_idx").on(table.type),
  activeIdx: index("lender_programs_active_idx").on(table.active),
}));

export const insertLenderProgramSchema = createInsertSchema(lenderPrograms).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLenderProgram = z.infer<typeof insertLenderProgramSchema>;
export type LenderProgram = typeof lenderPrograms.$inferSelect;

// ===== RATE REQUESTS TABLE =====
export const rateRequests = pgTable("rate_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  scenarioId: uuid("scenario_id").references(() => dealScenarios.id, { onDelete: "set null" }),
  
  // Request data
  creditScore: integer("credit_score").notNull(),
  cobuyerCreditScore: integer("cobuyer_credit_score"),
  requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }).notNull(),
  downPayment: decimal("down_payment", { precision: 12, scale: 2 }).notNull(),
  tradeValue: decimal("trade_value", { precision: 12, scale: 2 }).notNull().default("0.00"),
  tradePayoff: decimal("trade_payoff", { precision: 12, scale: 2 }).notNull().default("0.00"),
  term: integer("term").notNull(), // Requested term in months
  
  // Income/DTI data
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }),
  monthlyDebt: decimal("monthly_debt", { precision: 12, scale: 2 }),
  calculatedDti: decimal("calculated_dti", { precision: 5, scale: 2 }),
  
  // Vehicle data snapshot
  vehicleData: jsonb("vehicle_data").notNull(), // Snapshot of vehicle details
  
  // Request metadata
  requestType: text("request_type").notNull().default("soft_pull"), // soft_pull, hard_pull, manual
  requestData: jsonb("request_data").notNull().default('{}'), // Full request payload
  
  // Response data
  responseData: jsonb("response_data").notNull().default('{}'), // Raw response from all lenders
  responseCount: integer("response_count").notNull().default(0),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  
  // Timing
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"), // Rate lock expiration
  
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  dealIdx: index("rate_requests_deal_idx").on(table.dealId),
  statusIdx: index("rate_requests_status_idx").on(table.status),
  createdAtIdx: index("rate_requests_created_at_idx").on(table.createdAt),
}));

export const insertRateRequestSchema = createInsertSchema(rateRequests).omit({ id: true, createdAt: true });
export type InsertRateRequest = z.infer<typeof insertRateRequestSchema>;
export type RateRequest = typeof rateRequests.$inferSelect;

// ===== APPROVED LENDERS TABLE =====
export const approvedLenders = pgTable("approved_lenders", {
  id: uuid("id").primaryKey().defaultRandom(),
  rateRequestId: uuid("rate_request_id").notNull().references(() => rateRequests.id, { onDelete: "cascade" }),
  lenderId: uuid("lender_id").notNull().references(() => lenders.id),
  programId: uuid("program_id").references(() => lenderPrograms.id),
  
  // Approval details
  approvalStatus: text("approval_status").notNull(), // approved, conditional, declined, counter_offer
  approvalAmount: decimal("approval_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Rate details
  apr: decimal("apr", { precision: 5, scale: 3 }).notNull(), // Annual Percentage Rate
  buyRate: decimal("buy_rate", { precision: 5, scale: 3 }).notNull(), // Lender's buy rate
  dealerReserve: decimal("dealer_reserve", { precision: 5, scale: 3 }).notNull().default("0.00"), // Dealer markup
  flatFee: decimal("flat_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  // Payment calculation
  term: integer("term").notNull(), // Approved term in months
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }).notNull(),
  totalFinanceCharge: decimal("total_finance_charge", { precision: 12, scale: 2 }).notNull(),
  totalOfPayments: decimal("total_of_payments", { precision: 12, scale: 2 }).notNull(),
  
  // LTV/DTI at approval
  ltv: decimal("ltv", { precision: 5, scale: 2 }).notNull(), // Loan-to-value ratio
  dti: decimal("dti", { precision: 5, scale: 2 }), // Debt-to-income ratio
  pti: decimal("pti", { precision: 5, scale: 2 }), // Payment-to-income ratio
  
  // Conditions and stipulations
  stipulations: jsonb("stipulations").notNull().default('[]'), // Array of required documents/conditions
  specialConditions: text("special_conditions"),
  
  // Scoring and likelihood
  approvalScore: integer("approval_score"), // Internal scoring 0-100
  approvalLikelihood: text("approval_likelihood"), // high, medium, low
  
  // Incentives
  incentives: jsonb("incentives").notNull().default('[]'), // Rebates, cash back, etc.
  specialRate: boolean("special_rate").notNull().default(false), // Flag for promotional rates
  
  // Selection tracking
  selected: boolean("selected").notNull().default(false),
  selectedAt: timestamp("selected_at"),
  selectedBy: uuid("selected_by").references(() => users.id),
  
  // Expiration
  offerExpiresAt: timestamp("offer_expires_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  rateRequestIdx: index("approved_lenders_rate_request_idx").on(table.rateRequestId),
  lenderIdx: index("approved_lenders_lender_idx").on(table.lenderId),
  selectedIdx: index("approved_lenders_selected_idx").on(table.selected),
  aprIdx: index("approved_lenders_apr_idx").on(table.apr),
}));

export const insertApprovedLenderSchema = createInsertSchema(approvedLenders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApprovedLender = z.infer<typeof insertApprovedLenderSchema>;
export type ApprovedLender = typeof approvedLenders.$inferSelect;

// ===== RELATIONS =====
export const usersRelations = relations(users, ({ many }) => ({
  dealsAsSalesperson: many(deals, { relationName: "salesperson" }),
  dealsAsSalesManager: many(deals, { relationName: "salesManager" }),
  dealsAsFinanceManager: many(deals, { relationName: "financeManager" }),
  auditLogs: many(auditLog),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  deals: many(deals),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  deals: many(deals),
}));

export const tradeVehiclesRelations = relations(tradeVehicles, ({ one, many }) => ({
  deal: one(deals, {
    fields: [tradeVehicles.dealId],
    references: [deals.id],
  }),
  scenarios: many(dealScenarios),
}));

export const quickQuotesRelations = relations(quickQuotes, ({ one, many }) => ({
  salesperson: one(users, {
    fields: [quickQuotes.salespersonId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [quickQuotes.vehicleId],
    references: [vehicles.id],
  }),
  deal: one(deals, {
    fields: [quickQuotes.dealId],
    references: [deals.id],
  }),
  contacts: many(quickQuoteContacts),
}));

export const quickQuoteContactsRelations = relations(quickQuoteContacts, ({ one }) => ({
  quickQuote: one(quickQuotes, {
    fields: [quickQuoteContacts.quickQuoteId],
    references: [quickQuotes.id],
  }),
  customer: one(customers, {
    fields: [quickQuoteContacts.customerId],
    references: [customers.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  salesperson: one(users, {
    fields: [deals.salespersonId],
    references: [users.id],
    relationName: "salesperson",
  }),
  salesManager: one(users, {
    fields: [deals.salesManagerId],
    references: [users.id],
    relationName: "salesManager",
  }),
  financeManager: one(users, {
    fields: [deals.financeManagerId],
    references: [users.id],
    relationName: "financeManager",
  }),
  customer: one(customers, {
    fields: [deals.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [deals.vehicleId],
    references: [vehicles.id],
  }),
  tradeVehicle: one(tradeVehicles, {
    fields: [deals.tradeVehicleId],
    references: [tradeVehicles.id],
  }),
  tradeVehicles: many(tradeVehicles),
  scenarios: many(dealScenarios),
  auditLogs: many(auditLog),
}));

export const taxRuleGroupsRelations = relations(taxRuleGroups, ({ many }) => ({
  jurisdictions: many(taxJurisdictions),
}));

export const taxJurisdictionsRelations = relations(taxJurisdictions, ({ one, many }) => ({
  taxRuleGroup: one(taxRuleGroups, {
    fields: [taxJurisdictions.taxRuleGroupId],
    references: [taxRuleGroups.id],
  }),
  dealScenarios: many(dealScenarios),
  zipCodes: many(zipCodeLookup),
}));

export const zipCodeLookupRelations = relations(zipCodeLookup, ({ one }) => ({
  taxJurisdiction: one(taxJurisdictions, {
    fields: [zipCodeLookup.taxJurisdictionId],
    references: [taxJurisdictions.id],
  }),
}));

export const dealScenariosRelations = relations(dealScenarios, ({ one, many }) => ({
  deal: one(deals, {
    fields: [dealScenarios.dealId],
    references: [deals.id],
  }),
  vehicle: one(vehicles, {
    fields: [dealScenarios.vehicleId],
    references: [vehicles.id],
  }),
  tradeVehicle: one(tradeVehicles, {
    fields: [dealScenarios.tradeVehicleId],
    references: [tradeVehicles.id],
  }),
  taxJurisdiction: one(taxJurisdictions, {
    fields: [dealScenarios.taxJurisdictionId],
    references: [taxJurisdictions.id],
  }),
  auditLogs: many(auditLog),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  deal: one(deals, {
    fields: [auditLog.dealId],
    references: [deals.id],
  }),
  scenario: one(dealScenarios, {
    fields: [auditLog.scenarioId],
    references: [dealScenarios.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// ===== TYPES FOR FRONTEND =====
export type DealWithRelations = Deal & {
  customer: Customer;
  vehicle: Vehicle;
  tradeVehicle: TradeVehicle | null;
  salesperson: User;
  salesManager: User | null;
  financeManager: User | null;
  scenarios: DealScenario[];
};

export type TaxJurisdictionWithRules = TaxJurisdiction & {
  taxRuleGroup: TaxRuleGroup | null;
};

export type ScenarioWithRelations = DealScenario & {
  taxJurisdiction: TaxJurisdictionWithRules | null;
};

export type DealerFee = {
  name: string;
  amount: number;
  taxable: boolean;
};

export type Accessory = {
  name: string;
  amount: number;
  taxable: boolean;
};

export type AftermarketProduct = {
  id: string; // Unique ID within the scenario (use nanoid or uuid)
  name: string;
  category: 'warranty' | 'gap' | 'maintenance' | 'tire_wheel' | 'theft' | 'paint_protection' | 'window_tint' | 'bedliner' | 'etch' | 'custom';
  cost: number; // Dealer cost
  price: number; // Customer price (what they pay)
  term?: number; // Term in months (for warranties, maintenance, etc.)
  taxable: boolean; // Whether this product is taxed (varies by state/product type)
};

// ===== FEE PACKAGE TEMPLATES TABLE =====
// Pre-configured packages for bulk-adding fees, accessories, and F&I products
export const feePackageTemplates = pgTable("fee_package_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // e.g., "Basic Package", "Premium Package", "Luxury Package"
  description: text("description"),
  category: text("category").notNull().default("custom"), // basic, premium, luxury, custom
  
  // Multi-tenant scoping (null = global template available to all dealerships)
  dealershipId: uuid("dealership_id"), // .references(() => dealerships.id) when dealerships table exists
  
  // Audit trail
  createdBy: uuid("created_by").notNull().references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  
  // Display order for UI sorting (lower numbers appear first)
  displayOrder: integer("display_order").notNull().default(0),
  
  // Pre-configured items (stored as JSONB arrays matching deal_scenarios structure)
  dealerFees: jsonb("dealer_fees").notNull().default([]), // [{name: string, amount: number, taxable: boolean}]
  accessories: jsonb("accessories").notNull().default([]), // [{name: string, amount: number, taxable: boolean}]
  aftermarketProducts: jsonb("aftermarket_products").notNull().default([]), // AftermarketProduct[]
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index("fee_package_templates_category_idx").on(table.category),
  activeIdx: index("fee_package_templates_active_idx").on(table.isActive),
  dealershipIdx: index("fee_package_templates_dealership_idx").on(table.dealershipId),
  displayOrderIdx: index("fee_package_templates_display_order_idx").on(table.displayOrder),
  createdByIdx: index("fee_package_templates_created_by_idx").on(table.createdBy),
}));

export const insertFeePackageTemplateSchema = createInsertSchema(feePackageTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeePackageTemplate = z.infer<typeof insertFeePackageTemplateSchema>;
export type FeePackageTemplate = typeof feePackageTemplates.$inferSelect;

export type DealStats = {
  total: number;
  draft: number;
  inProgress: number;
  approved: number;
  cancelled: number;
  totalRevenue: number;
  avgDealValue: number;
  conversionRate: number;
};

// ===== DEALERSHIP SETTINGS TABLE =====
export const dealershipSettings = pgTable("dealership_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealershipId: text("dealership_id").notNull().unique().default("default"), // Future multi-tenant support
  dealershipName: text("dealership_name").notNull(),
  
  // Contact & Location
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  
  // Branding
  logo: text("logo"), // URL or base64
  primaryColor: text("primary_color").default("#0066cc"),
  
  // Tax & Fee Defaults
  defaultTaxRate: decimal("default_tax_rate", { precision: 5, scale: 4 }).default("0.0825"), // 8.25%
  docFee: decimal("doc_fee", { precision: 10, scale: 2 }).default("299.00"),
  
  // Business Settings
  timezone: text("timezone").default("America/New_York"),
  currency: text("currency").default("USD"),
  
  // Preferences (notifications, features, etc.)
  settings: jsonb("settings").default({}),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealershipSettingsSchema = createInsertSchema(dealershipSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDealershipSettings = z.infer<typeof insertDealershipSettingsSchema>;
export type DealershipSettings = typeof dealershipSettings.$inferSelect;

// ===== DEAL NUMBER SEQUENCES TABLE =====
// Atomic counters for deal number generation per dealership
export const dealNumberSequences = pgTable("deal_number_sequences", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealershipId: uuid("dealership_id").notNull().unique(),
  currentSequence: integer("current_sequence").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dealershipIdx: index("deal_number_sequences_dealership_idx").on(table.dealershipId),
}));

export const insertDealNumberSequenceSchema = createInsertSchema(dealNumberSequences).omit({ id: true, updatedAt: true });
export type InsertDealNumberSequence = z.infer<typeof insertDealNumberSequenceSchema>;
export type DealNumberSequence = typeof dealNumberSequences.$inferSelect;

// ===== PERMISSIONS TABLE =====
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // e.g., "deals:create", "deals:edit", "deals:delete", "inventory:view"
  description: text("description"),
  category: text("category").notNull(), // e.g., "deals", "inventory", "customers", "settings"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index("permissions_category_idx").on(table.category),
}));

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// ===== ROLE PERMISSIONS TABLE (Many-to-Many) =====
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(), // salesperson, sales_manager, finance_manager, admin
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  rolePermissionIdx: index("role_permissions_role_permission_idx").on(table.role, table.permissionId),
}));

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true, createdAt: true });
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// ===== SECURITY AUDIT LOG TABLE =====
export const securityAuditLog = pgTable("security_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // null if user deleted
  username: text("username"), // Denormalized for historical record
  
  // Event details
  eventType: text("event_type").notNull(), // login, logout, login_failed, password_reset, role_change, permission_grant, mfa_enabled, etc.
  eventCategory: text("event_category").notNull(), // authentication, authorization, account_management, security
  
  // Context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Additional metadata (JSON)
  metadata: jsonb("metadata").default({}), // e.g., { oldRole: "salesperson", newRole: "admin", changedBy: "userId" }
  
  // Result
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("security_audit_log_user_id_idx").on(table.userId),
  eventTypeIdx: index("security_audit_log_event_type_idx").on(table.eventType),
  categoryIdx: index("security_audit_log_category_idx").on(table.eventCategory),
  createdAtIdx: index("security_audit_log_created_at_idx").on(table.createdAt),
}));

export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLog).omit({ id: true, createdAt: true });
export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;
export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;

// ===== DEALERSHIP STOCK NUMBER SETTINGS TABLE =====
export const dealershipStockSettings = pgTable("dealership_stock_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealershipId: uuid("dealership_id").notNull().references(() => dealershipSettings.id, { onDelete: "cascade" }).unique(), // One config per dealership
  
  // Stock number format configuration
  prefix: text("prefix").notNull().default("STK"), // e.g., "STK", "INV", "USED"
  useYearPrefix: boolean("use_year_prefix").notNull().default(true), // Include year (e.g., "STK-2024-")
  paddingLength: integer("padding_length").notNull().default(6), // e.g., 6 = "000001"
  currentCounter: integer("current_counter").notNull().default(1), // Auto-increments
  
  // Format preview (read-only, generated)
  formatPreview: text("format_preview"), // e.g., "STK-2024-000001"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dealershipIdx: index("dealership_stock_settings_dealership_idx").on(table.dealershipId),
}));

export const insertDealershipStockSettingsSchema = createInsertSchema(dealershipStockSettings).omit({ 
  id: true, 
  currentCounter: true, // Auto-managed
  formatPreview: true, // Auto-generated
  createdAt: true, 
  updatedAt: true 
});
export type InsertDealershipStockSettings = z.infer<typeof insertDealershipStockSettingsSchema>;
export type DealershipStockSettings = typeof dealershipStockSettings.$inferSelect;

// ===== VEHICLE VALUATIONS TABLE =====
// Third-party valuation data from KBB, Black Book, MMR, etc.
export const vehicleValuations = pgTable("vehicle_valuations", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  
  // Valuation source metadata
  provider: text("provider").notNull(), // "KBB", "BlackBook", "MMR", "JDPower", "NADA"
  valuationType: text("valuation_type").notNull(), // "wholesale", "retail", "trade_in", "private_party"
  
  // Valuation amounts
  baseValue: decimal("base_value", { precision: 12, scale: 2 }), // Base valuation
  adjustedValue: decimal("adjusted_value", { precision: 12, scale: 2 }), // Adjusted for mileage/condition/region
  lowRange: decimal("low_range", { precision: 12, scale: 2 }),
  highRange: decimal("high_range", { precision: 12, scale: 2 }),
  
  // Condition adjustments
  conditionGrade: text("condition_grade"), // e.g., "excellent", "good", "fair", "poor", CR grade
  mileageAdjustment: decimal("mileage_adjustment", { precision: 12, scale: 2 }),
  regionAdjustment: decimal("region_adjustment", { precision: 12, scale: 2 }),
  
  // Provider-specific data (JSONB for flexibility)
  providerData: jsonb("provider_data").default({}), // Raw API response, additional fields
  
  // Data freshness
  valuationDate: timestamp("valuation_date").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // When this valuation becomes stale
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  vehicleProviderIdx: index("vehicle_valuations_vehicle_provider_idx").on(table.vehicleId, table.provider),
  providerIdx: index("vehicle_valuations_provider_idx").on(table.provider),
}));

export const insertVehicleValuationSchema = createInsertSchema(vehicleValuations).omit({ id: true, createdAt: true });
export type InsertVehicleValuation = z.infer<typeof insertVehicleValuationSchema>;
export type VehicleValuation = typeof vehicleValuations.$inferSelect;

// ===== VEHICLE COMPARABLES TABLE =====
// Comparable vehicles ("comps") and recent sales data
export const vehicleComparables = pgTable("vehicle_comparables", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  
  // Comparable vehicle details
  source: text("source").notNull(), // "auction", "retail_listing", "dealer_sale", "private_sale"
  sourceId: text("source_id"), // External reference (auction lot #, listing ID, etc.)
  
  // Vehicle match details
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  mileage: integer("mileage").notNull(),
  condition: text("condition"),
  
  // Transaction details
  salePrice: decimal("sale_price", { precision: 12, scale: 2 }),
  listPrice: decimal("list_price", { precision: 12, scale: 2 }), // For listings
  saleDate: timestamp("sale_date"),
  daysOnMarket: integer("days_on_market"),
  
  // Location
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  distanceMiles: integer("distance_miles"), // Distance from dealership
  
  // Similarity score (algorithmic match 0-100)
  similarityScore: integer("similarity_score"), // How close this comp is to the target vehicle
  
  // Additional metadata
  metadata: jsonb("metadata").default({}), // Images, features, notes
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  vehicleIdx: index("vehicle_comparables_vehicle_idx").on(table.vehicleId),
  sourceIdx: index("vehicle_comparables_source_idx").on(table.source),
  saleDateIdx: index("vehicle_comparables_sale_date_idx").on(table.saleDate),
}));

export const insertVehicleComparableSchema = createInsertSchema(vehicleComparables).omit({ id: true, createdAt: true });
export type InsertVehicleComparable = z.infer<typeof insertVehicleComparableSchema>;
export type VehicleComparable = typeof vehicleComparables.$inferSelect;
