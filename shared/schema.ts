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
  role: text("role").notNull().default("salesperson"), // salesperson, sales_manager, finance_manager, admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ===== CUSTOMERS TABLE =====
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("customers_name_idx").on(table.firstName, table.lastName),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ===== VEHICLES TABLE =====
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  stockNumber: uuid("stock_number").notNull().unique().defaultRandom(), // UUID for stock numbers
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
  dealNumber: text("deal_number").notNull().unique(),
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
