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
  stockNumber: text("stock_number").notNull().unique(),
  vin: text("vin").notNull().unique(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  mileage: integer("mileage").notNull(),
  exteriorColor: text("exterior_color"),
  interiorColor: text("interior_color"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  msrp: decimal("msrp", { precision: 12, scale: 2 }),
  invoice: decimal("invoice", { precision: 12, scale: 2 }),
  isNew: boolean("is_new").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  stockIdx: index("vehicles_stock_idx").on(table.stockNumber),
  vinIdx: index("vehicles_vin_idx").on(table.vin),
}));

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

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

// ===== DEALS TABLE =====
export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealNumber: text("deal_number").notNull().unique(),
  dealershipId: uuid("dealership_id").notNull().default(sql`gen_random_uuid()`),
  salespersonId: uuid("salesperson_id").notNull().references(() => users.id),
  salesManagerId: uuid("sales_manager_id").references(() => users.id),
  financeManagerId: uuid("finance_manager_id").references(() => users.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
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
