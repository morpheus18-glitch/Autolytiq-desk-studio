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

// ===== TAX JURISDICTIONS TABLE =====
export const taxJurisdictions = pgTable("tax_jurisdictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  state: text("state").notNull(),
  county: text("county"),
  city: text("city"),
  township: text("township"),
  specialDistrict: text("special_district"),
  zipCode: text("zip_code"),
  stateTaxRate: decimal("state_tax_rate", { precision: 6, scale: 4 }).notNull(),
  countyTaxRate: decimal("county_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  cityTaxRate: decimal("city_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  townshipTaxRate: decimal("township_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  specialDistrictTaxRate: decimal("special_district_tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  tradeInCreditType: text("trade_in_credit_type").notNull().default("tax_on_difference"), // none, full_credit, tax_on_difference
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  titleFee: decimal("title_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  plateFee: decimal("plate_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  docFeeMax: decimal("doc_fee_max", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  stateIdx: index("tax_jurisdictions_state_idx").on(table.state, table.county, table.city),
  zipIdx: index("tax_jurisdictions_zip_idx").on(table.zipCode),
}));

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
  
  // Tax jurisdiction
  taxJurisdictionId: uuid("tax_jurisdiction_id").references(() => taxJurisdictions.id),
  
  // Calculated values (stored for performance)
  totalTax: decimal("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  totalFees: decimal("total_fees", { precision: 12, scale: 2 }).notNull().default("0"),
  amountFinanced: decimal("amount_financed", { precision: 12, scale: 2 }).notNull().default("0"),
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  
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

export const tradeVehiclesRelations = relations(tradeVehicles, ({ many }) => ({
  deals: many(deals),
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
  scenarios: many(dealScenarios),
  auditLogs: many(auditLog),
}));

export const dealScenariosRelations = relations(dealScenarios, ({ one, many }) => ({
  deal: one(deals, {
    fields: [dealScenarios.dealId],
    references: [deals.id],
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

export type ScenarioWithRelations = DealScenario & {
  taxJurisdiction: TaxJurisdiction | null;
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
