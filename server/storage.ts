// Referenced from javascript_database blueprint integration
import { 
  users, customers, vehicles, tradeVehicles, deals, dealScenarios, auditLog, taxJurisdictions, taxRuleGroups,
  lenders, lenderPrograms, rateRequests, approvedLenders, quickQuotes, quickQuoteContacts, feePackageTemplates,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Vehicle, type InsertVehicle,
  type TradeVehicle, type InsertTradeVehicle,
  type Deal, type InsertDeal,
  type DealScenario, type InsertDealScenario,
  type AuditLog, type InsertAuditLog,
  type TaxJurisdiction, type InsertTaxJurisdiction, type TaxJurisdictionWithRules,
  type DealWithRelations,
  type DealStats,
  type Lender, type InsertLender,
  type LenderProgram, type InsertLenderProgram,
  type RateRequest, type InsertRateRequest,
  type ApprovedLender, type InsertApprovedLender,
  type QuickQuote, type InsertQuickQuote,
  type QuickQuoteContact, type InsertQuickQuoteContact,
  type FeePackageTemplate,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, or, like, sql, gte, lte, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  sessionStore: any;
  
  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  
  // Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByStock(stockNumber: string): Promise<Vehicle | undefined>;
  searchVehicles(query: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  
  // Inventory Management
  getInventory(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    condition?: string;
    make?: string;
    model?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
  }): Promise<{ vehicles: Vehicle[]; total: number; pages: number }>;
  getVehicleByStockNumber(stockNumber: string): Promise<Vehicle | undefined>;
  updateVehicleStatus(stockNumber: string, status: string): Promise<Vehicle>;
  searchInventory(filters: {
    query?: string;
    make?: string;
    model?: string;
    yearMin?: number;
    yearMax?: number;
    priceMin?: number;
    priceMax?: number;
    mileageMax?: number;
    condition?: string;
    status?: string;
    fuelType?: string;
    drivetrain?: string;
    transmission?: string;
  }): Promise<Vehicle[]>;
  
  // Trade Vehicles
  getTradeVehiclesByDeal(dealId: string): Promise<TradeVehicle[]>;
  getTradeVehicle(id: string): Promise<TradeVehicle | undefined>;
  createTradeVehicle(tradeVehicle: InsertTradeVehicle): Promise<TradeVehicle>;
  updateTradeVehicle(id: string, tradeVehicle: Partial<InsertTradeVehicle>): Promise<TradeVehicle>;
  deleteTradeVehicle(id: string): Promise<void>;
  
  // Tax Jurisdictions
  getAllTaxJurisdictions(): Promise<TaxJurisdictionWithRules[]>;
  getTaxJurisdiction(state: string, county?: string, city?: string): Promise<TaxJurisdictionWithRules | undefined>;
  createTaxJurisdiction(jurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction>;
  
  // Quick Quotes
  createQuickQuote(quote: InsertQuickQuote): Promise<QuickQuote>;
  getQuickQuote(id: string): Promise<QuickQuote | undefined>;
  updateQuickQuote(id: string, data: Partial<Pick<QuickQuote, 'status' | 'dealId'>>): Promise<QuickQuote>;
  updateQuickQuotePayload(id: string, payload: any): Promise<QuickQuote>;
  createQuickQuoteContact(contact: InsertQuickQuoteContact): Promise<QuickQuoteContact>;
  updateQuickQuoteContactStatus(id: string, status: string, sentAt: Date): Promise<QuickQuoteContact>;
  
  // Deals
  getDeal(id: string): Promise<DealWithRelations | undefined>;
  getDeals(options: { page: number; pageSize: number; search?: string; status?: string }): Promise<{ deals: DealWithRelations[]; total: number; pages: number }>;
  getDealsStats(): Promise<DealStats>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal>;
  updateDealState(id: string, state: string): Promise<Deal>;
  
  // Deal Scenarios
  getScenario(id: string): Promise<DealScenario | undefined>;
  createScenario(scenario: InsertDealScenario): Promise<DealScenario>;
  updateScenario(id: string, scenario: Partial<InsertDealScenario>): Promise<DealScenario>;
  deleteScenario(id: string): Promise<void>;
  
  // Audit Log
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getDealAuditLogs(dealId: string): Promise<AuditLog[]>;
  
  // Lenders
  getLenders(active?: boolean): Promise<Lender[]>;
  getLender(id: string): Promise<Lender | undefined>;
  createLender(lender: InsertLender): Promise<Lender>;
  updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender>;
  
  // Lender Programs
  getLenderPrograms(lenderId: string, active?: boolean): Promise<LenderProgram[]>;
  getLenderProgram(id: string): Promise<LenderProgram | undefined>;
  createLenderProgram(program: InsertLenderProgram): Promise<LenderProgram>;
  updateLenderProgram(id: string, program: Partial<InsertLenderProgram>): Promise<LenderProgram>;
  
  // Rate Requests
  createRateRequest(request: InsertRateRequest): Promise<RateRequest>;
  getRateRequest(id: string): Promise<RateRequest | undefined>;
  getRateRequestsByDeal(dealId: string): Promise<RateRequest[]>;
  updateRateRequest(id: string, request: Partial<InsertRateRequest>): Promise<RateRequest>;
  
  // Approved Lenders
  createApprovedLenders(lenders: InsertApprovedLender[]): Promise<ApprovedLender[]>;
  getApprovedLenders(rateRequestId: string): Promise<ApprovedLender[]>;
  selectApprovedLender(id: string, userId: string): Promise<ApprovedLender>;
  getSelectedLenderForDeal(dealId: string): Promise<ApprovedLender | undefined>;
  
  // Fee Package Templates
  getFeePackageTemplates(active?: boolean): Promise<FeePackageTemplate[]>;
  getFeePackageTemplate(id: string): Promise<FeePackageTemplate | undefined>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Customers
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }
  
  async searchCustomers(query: string): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(
        or(
          like(customers.firstName, `%${query}%`),
          like(customers.lastName, `%${query}%`),
          like(customers.email, `%${query}%`),
          like(customers.phone, `%${query}%`)
        )
      )
      .limit(20);
  }
  
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }
  
  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db.update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }
  
  // Vehicles
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }
  
  async getVehicleByStock(stockNumber: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.stockNumber, stockNumber));
    return vehicle || undefined;
  }
  
  async searchVehicles(query: string): Promise<Vehicle[]> {
    return await db.select().from(vehicles)
      .where(
        or(
          like(vehicles.stockNumber, `%${query}%`),
          like(vehicles.vin, `%${query}%`),
          like(vehicles.make, `%${query}%`),
          like(vehicles.model, `%${query}%`)
        )
      )
      .limit(20);
  }
  
  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }
  
  async updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db.update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }
  
  // Inventory Management
  async getInventory(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    condition?: string;
    make?: string;
    model?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
  }): Promise<{ vehicles: Vehicle[]; total: number; pages: number }> {
    const {
      page = 1,
      pageSize = 20,
      status = 'available',
      condition,
      make,
      model,
      minPrice,
      maxPrice,
      minYear,
      maxYear
    } = options;
    
    const offset = (page - 1) * pageSize;
    const conditions: any[] = [];
    
    if (status) conditions.push(eq(vehicles.status, status));
    if (condition) conditions.push(eq(vehicles.condition, condition));
    if (make) conditions.push(like(vehicles.make, `%${make}%`));
    if (model) conditions.push(like(vehicles.model, `%${model}%`));
    if (minPrice) conditions.push(gte(vehicles.price, String(minPrice)));
    if (maxPrice) conditions.push(lte(vehicles.price, String(maxPrice)));
    if (minYear) conditions.push(gte(vehicles.year, minYear));
    if (maxYear) conditions.push(lte(vehicles.year, maxYear));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(whereClause);
    
    const total = Number(totalResult.count);
    const pages = Math.ceil(total / pageSize);
    
    const vehicleList = await db
      .select()
      .from(vehicles)
      .where(whereClause)
      .orderBy(desc(vehicles.createdAt))
      .limit(pageSize)
      .offset(offset);
    
    return { vehicles: vehicleList, total, pages };
  }
  
  async getVehicleByStockNumber(stockNumber: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.stockNumber, stockNumber));
    return vehicle || undefined;
  }
  
  async updateVehicleStatus(stockNumber: string, status: string): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ status, updatedAt: new Date() })
      .where(eq(vehicles.stockNumber, stockNumber))
      .returning();
    
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }
    
    return vehicle;
  }
  
  async searchInventory(filters: {
    query?: string;
    make?: string;
    model?: string;
    yearMin?: number;
    yearMax?: number;
    priceMin?: number;
    priceMax?: number;
    mileageMax?: number;
    condition?: string;
    status?: string;
    fuelType?: string;
    drivetrain?: string;
    transmission?: string;
  }): Promise<Vehicle[]> {
    const conditions: any[] = [];
    
    if (filters.query) {
      conditions.push(
        or(
          like(vehicles.make, `%${filters.query}%`),
          like(vehicles.model, `%${filters.query}%`),
          like(vehicles.trim, `%${filters.query}%`),
          like(vehicles.vin, `%${filters.query}%`)
        )
      );
    }
    
    if (filters.make) conditions.push(eq(vehicles.make, filters.make));
    if (filters.model) conditions.push(eq(vehicles.model, filters.model));
    if (filters.yearMin) conditions.push(gte(vehicles.year, filters.yearMin));
    if (filters.yearMax) conditions.push(lte(vehicles.year, filters.yearMax));
    if (filters.priceMin) conditions.push(gte(vehicles.price, String(filters.priceMin)));
    if (filters.priceMax) conditions.push(lte(vehicles.price, String(filters.priceMax)));
    if (filters.mileageMax) conditions.push(lte(vehicles.mileage, filters.mileageMax));
    if (filters.condition) conditions.push(eq(vehicles.condition, filters.condition));
    if (filters.status) conditions.push(eq(vehicles.status, filters.status));
    if (filters.fuelType) conditions.push(eq(vehicles.fuelType, filters.fuelType));
    if (filters.drivetrain) conditions.push(eq(vehicles.drivetrain, filters.drivetrain));
    if (filters.transmission) conditions.push(eq(vehicles.transmission, filters.transmission));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db
      .select()
      .from(vehicles)
      .where(whereClause)
      .orderBy(asc(vehicles.price))
      .limit(100);
  }
  
  // Trade Vehicles
  async getTradeVehiclesByDeal(dealId: string): Promise<TradeVehicle[]> {
    return await db.select().from(tradeVehicles).where(eq(tradeVehicles.dealId, dealId));
  }

  async getTradeVehicle(id: string): Promise<TradeVehicle | undefined> {
    const [tradeVehicle] = await db.select().from(tradeVehicles).where(eq(tradeVehicles.id, id));
    return tradeVehicle || undefined;
  }

  async createTradeVehicle(insertTradeVehicle: InsertTradeVehicle): Promise<TradeVehicle> {
    const [tradeVehicle] = await db.insert(tradeVehicles).values(insertTradeVehicle).returning();
    return tradeVehicle;
  }

  async updateTradeVehicle(id: string, data: Partial<InsertTradeVehicle>): Promise<TradeVehicle> {
    const [tradeVehicle] = await db.update(tradeVehicles)
      .set(data)
      .where(eq(tradeVehicles.id, id))
      .returning();
    return tradeVehicle;
  }

  async deleteTradeVehicle(id: string): Promise<void> {
    await db.delete(tradeVehicles).where(eq(tradeVehicles.id, id));
  }
  
  // Tax Jurisdictions
  async getAllTaxJurisdictions(): Promise<TaxJurisdictionWithRules[]> {
    const jurisdictions = await db
      .select()
      .from(taxJurisdictions)
      .leftJoin(taxRuleGroups, eq(taxJurisdictions.taxRuleGroupId, taxRuleGroups.id));
    
    return jurisdictions.map(row => ({
      ...row.tax_jurisdictions,
      taxRuleGroup: row.tax_rule_groups || null
    }));
  }
  
  async getTaxJurisdiction(state: string, county?: string, city?: string): Promise<TaxJurisdictionWithRules | undefined> {
    const conditions = [eq(taxJurisdictions.state, state)];
    
    if (county) {
      conditions.push(eq(taxJurisdictions.county, county));
    }
    if (city) {
      conditions.push(eq(taxJurisdictions.city, city));
    }
    
    const result = await db
      .select()
      .from(taxJurisdictions)
      .leftJoin(taxRuleGroups, eq(taxJurisdictions.taxRuleGroupId, taxRuleGroups.id))
      .where(and(...conditions));
    
    if (!result || result.length === 0) return undefined;
    
    const [row] = result;
    return {
      ...row.tax_jurisdictions,
      taxRuleGroup: row.tax_rule_groups || null
    };
  }
  
  async createTaxJurisdiction(insertJurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction> {
    const [jurisdiction] = await db.insert(taxJurisdictions).values(insertJurisdiction).returning();
    return jurisdiction;
  }
  
  // Quick Quotes
  async createQuickQuote(insertQuote: InsertQuickQuote): Promise<QuickQuote> {
    const [quote] = await db.insert(quickQuotes).values(insertQuote).returning();
    return quote;
  }

  async getQuickQuote(id: string): Promise<QuickQuote | undefined> {
    const [quote] = await db.select().from(quickQuotes).where(eq(quickQuotes.id, id));
    return quote || undefined;
  }

  async updateQuickQuote(id: string, data: Partial<Pick<QuickQuote, 'status' | 'dealId'>>): Promise<QuickQuote> {
    const [quote] = await db.update(quickQuotes).set(data).where(eq(quickQuotes.id, id)).returning();
    return quote;
  }

  async updateQuickQuotePayload(id: string, payload: any): Promise<QuickQuote> {
    const [quote] = await db.update(quickQuotes).set({ quotePayload: payload }).where(eq(quickQuotes.id, id)).returning();
    return quote;
  }

  async createQuickQuoteContact(insertContact: InsertQuickQuoteContact): Promise<QuickQuoteContact> {
    const [contact] = await db.insert(quickQuoteContacts).values(insertContact).returning();
    return contact;
  }

  async updateQuickQuoteContactStatus(id: string, status: string, sentAt: Date): Promise<QuickQuoteContact> {
    const [contact] = await db.update(quickQuoteContacts)
      .set({ smsDeliveryStatus: status, smsSentAt: sentAt })
      .where(eq(quickQuoteContacts.id, id))
      .returning();
    return contact;
  }
  
  // Deals
  async getDeal(id: string): Promise<DealWithRelations | undefined> {
    const result = await db.query.deals.findFirst({
      where: eq(deals.id, id),
      with: {
        customer: true,
        vehicle: true,
        tradeVehicle: true,
        salesperson: true,
        salesManager: true,
        financeManager: true,
        scenarios: {
          with: {
            taxJurisdiction: true,
          },
        },
      },
    });
    return result as DealWithRelations | undefined;
  }
  
  async getDeals(options: { page: number; pageSize: number; search?: string; status?: string }) {
    const { page, pageSize, search, status } = options;
    const offset = (page - 1) * pageSize;
    
    let conditions: any[] = [];
    
    if (status && status !== 'all') {
      conditions.push(eq(deals.dealState, status));
    }
    
    if (search) {
      conditions.push(
        or(
          like(deals.dealNumber, `%${search}%`)
        )
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(whereClause);
    
    const total = Number(totalResult.count);
    const pages = Math.ceil(total / pageSize);
    
    const results = await db.query.deals.findMany({
      where: whereClause,
      with: {
        customer: true,
        vehicle: true,
        tradeVehicle: true,
        salesperson: true,
        salesManager: true,
        financeManager: true,
        scenarios: true,
      },
      orderBy: desc(deals.createdAt),
      limit: pageSize,
      offset,
    });
    
    return {
      deals: results as DealWithRelations[],
      total,
      pages,
    };
  }
  
  async getDealsStats(): Promise<DealStats> {
    // Get deal counts and revenue in one query
    const result = await db.select({
      total: sql<number>`count(distinct ${deals.id})::int`,
      draft: sql<number>`sum(case when ${deals.dealState} = 'DRAFT' then 1 else 0 end)::int`,
      inProgress: sql<number>`sum(case when ${deals.dealState} = 'IN_PROGRESS' then 1 else 0 end)::int`,
      approved: sql<number>`sum(case when ${deals.dealState} = 'APPROVED' then 1 else 0 end)::int`,
      cancelled: sql<number>`sum(case when ${deals.dealState} = 'CANCELLED' then 1 else 0 end)::int`,
      totalRevenue: sql<number>`
        coalesce(sum(
          case when ${deals.dealState} = 'APPROVED' and ${dealScenarios.vehiclePrice} is not null 
          then ${dealScenarios.vehiclePrice}::numeric 
          else 0 end
        ), 0)::numeric
      `,
    })
    .from(deals)
    .leftJoin(dealScenarios, eq(deals.activeScenarioId, dealScenarios.id));
    
    const stats = result[0] || {
      total: 0,
      draft: 0,
      inProgress: 0,
      approved: 0,
      cancelled: 0,
      totalRevenue: 0,
    };
    
    // Calculate derived metrics
    const totalRevenue = Number(stats.totalRevenue) || 0;
    const approved = Number(stats.approved) || 0;
    const avgDealValue = approved > 0 ? totalRevenue / approved : 0;
    const conversionRate = stats.total > 0 ? approved / stats.total : 0;
    
    return {
      total: Number(stats.total) || 0,
      draft: Number(stats.draft) || 0,
      inProgress: Number(stats.inProgress) || 0,
      approved,
      cancelled: Number(stats.cancelled) || 0,
      totalRevenue: Math.round(totalRevenue),
      avgDealValue: Math.round(avgDealValue),
      conversionRate,
    };
  }
  
  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    // Generate deal number: DEAL-YYYYMMDD-XXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Get count of deals today to generate sequential number
    const dayStart = new Date(year, now.getMonth(), now.getDate());
    const dayEnd = new Date(year, now.getMonth(), now.getDate() + 1);
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(and(
        sql`${deals.createdAt} >= ${dayStart}`,
        sql`${deals.createdAt} < ${dayEnd}`
      ));
    
    const sequenceNumber = String(Number(countResult.count) + 1).padStart(3, '0');
    const dealNumber = `DEAL-${year}${month}${day}-${sequenceNumber}`;
    
    const [deal] = await db.insert(deals)
      .values({ ...insertDeal, dealNumber })
      .returning();
    
    // Auto-create a default scenario for every new deal
    // Get vehicle price if vehicle is selected
    let vehiclePrice = '0';
    if (insertDeal.vehicleId) {
      const vehicle = await this.getVehicle(insertDeal.vehicleId);
      if (vehicle) {
        vehiclePrice = vehicle.price;
      }
    }
    
    // Create default scenario with sensible automotive finance defaults
    await this.createScenario({
      dealId: deal.id,
      name: 'Scenario 1',
      scenarioType: 'FINANCE_DEAL',
      vehicleId: insertDeal.vehicleId,
      vehiclePrice,
      downPayment: '0',
      tradeAllowance: '0',
      tradePayoff: '0',
      term: 60,  // 60 months standard
      apr: '8.9',  // Standard APR
      totalTax: '0',
      totalFees: '0',
      monthlyPayment: '0',
      aftermarketProducts: [],
    });
    
    return deal;
  }
  
  async updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal> {
    const [deal] = await db.update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return deal;
  }
  
  async updateDealState(id: string, state: string): Promise<Deal> {
    const [deal] = await db.update(deals)
      .set({ dealState: state, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return deal;
  }
  
  // Deal Scenarios
  async getScenario(id: string): Promise<DealScenario | undefined> {
    const [scenario] = await db.select().from(dealScenarios).where(eq(dealScenarios.id, id));
    return scenario || undefined;
  }
  
  async createScenario(insertScenario: InsertDealScenario): Promise<DealScenario> {
    const [scenario] = await db.insert(dealScenarios).values(insertScenario).returning();
    return scenario;
  }
  
  async updateScenario(id: string, data: Partial<InsertDealScenario>): Promise<DealScenario> {
    const [scenario] = await db.update(dealScenarios)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dealScenarios.id, id))
      .returning();
    return scenario;
  }
  
  async deleteScenario(id: string): Promise<void> {
    await db.delete(dealScenarios).where(eq(dealScenarios.id, id));
  }
  
  // Audit Log
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLog).values(insertLog).returning();
    return log;
  }
  
  async getDealAuditLogs(dealId: string): Promise<AuditLog[]> {
    return await db.query.auditLog.findMany({
      where: eq(auditLog.dealId, dealId),
      with: {
        user: true,
      },
      orderBy: desc(auditLog.timestamp),
      limit: 100,
    });
  }
  
  // Lenders
  async getLenders(active?: boolean): Promise<Lender[]> {
    if (active !== undefined) {
      return await db.select().from(lenders).where(eq(lenders.active, active));
    }
    return await db.select().from(lenders);
  }
  
  async getLender(id: string): Promise<Lender | undefined> {
    const [lender] = await db.select().from(lenders).where(eq(lenders.id, id));
    return lender || undefined;
  }
  
  async createLender(insertLender: InsertLender): Promise<Lender> {
    const [lender] = await db.insert(lenders).values(insertLender).returning();
    return lender;
  }
  
  async updateLender(id: string, data: Partial<InsertLender>): Promise<Lender> {
    const [lender] = await db.update(lenders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lenders.id, id))
      .returning();
    return lender;
  }
  
  // Lender Programs
  async getLenderPrograms(lenderId: string, active?: boolean): Promise<LenderProgram[]> {
    const conditions = [eq(lenderPrograms.lenderId, lenderId)];
    if (active !== undefined) {
      conditions.push(eq(lenderPrograms.active, active));
    }
    return await db.select().from(lenderPrograms).where(and(...conditions));
  }
  
  async getLenderProgram(id: string): Promise<LenderProgram | undefined> {
    const [program] = await db.select().from(lenderPrograms).where(eq(lenderPrograms.id, id));
    return program || undefined;
  }
  
  async createLenderProgram(insertProgram: InsertLenderProgram): Promise<LenderProgram> {
    const [program] = await db.insert(lenderPrograms).values(insertProgram).returning();
    return program;
  }
  
  async updateLenderProgram(id: string, data: Partial<InsertLenderProgram>): Promise<LenderProgram> {
    const [program] = await db.update(lenderPrograms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lenderPrograms.id, id))
      .returning();
    return program;
  }
  
  // Rate Requests
  async createRateRequest(insertRequest: InsertRateRequest): Promise<RateRequest> {
    const [request] = await db.insert(rateRequests).values(insertRequest).returning();
    return request;
  }
  
  async getRateRequest(id: string): Promise<RateRequest | undefined> {
    const [request] = await db.select().from(rateRequests).where(eq(rateRequests.id, id));
    return request || undefined;
  }
  
  async getRateRequestsByDeal(dealId: string): Promise<RateRequest[]> {
    return await db.select()
      .from(rateRequests)
      .where(eq(rateRequests.dealId, dealId))
      .orderBy(desc(rateRequests.createdAt));
  }
  
  async updateRateRequest(id: string, data: Partial<InsertRateRequest>): Promise<RateRequest> {
    const [request] = await db.update(rateRequests)
      .set(data)
      .where(eq(rateRequests.id, id))
      .returning();
    return request;
  }
  
  // Approved Lenders
  async createApprovedLenders(insertLenders: InsertApprovedLender[]): Promise<ApprovedLender[]> {
    const results = await db.insert(approvedLenders).values(insertLenders).returning();
    return results;
  }
  
  async getApprovedLenders(rateRequestId: string): Promise<ApprovedLender[]> {
    return await db.select()
      .from(approvedLenders)
      .where(eq(approvedLenders.rateRequestId, rateRequestId))
      .orderBy(asc(approvedLenders.apr));
  }
  
  async selectApprovedLender(id: string, userId: string): Promise<ApprovedLender> {
    // First, deselect any previously selected lenders for the same rate request
    const [lender] = await db.select().from(approvedLenders).where(eq(approvedLenders.id, id));
    
    if (lender) {
      await db.update(approvedLenders)
        .set({ selected: false, selectedAt: null, selectedBy: null })
        .where(and(
          eq(approvedLenders.rateRequestId, lender.rateRequestId),
          eq(approvedLenders.selected, true)
        ));
    }
    
    // Now select the new lender
    const [selected] = await db.update(approvedLenders)
      .set({ 
        selected: true, 
        selectedAt: new Date(), 
        selectedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(approvedLenders.id, id))
      .returning();
    
    return selected;
  }
  
  async getSelectedLenderForDeal(dealId: string): Promise<ApprovedLender | undefined> {
    const [result] = await db.select()
      .from(approvedLenders)
      .innerJoin(rateRequests, eq(approvedLenders.rateRequestId, rateRequests.id))
      .where(and(
        eq(rateRequests.dealId, dealId),
        eq(approvedLenders.selected, true)
      ))
      .orderBy(desc(approvedLenders.selectedAt))
      .limit(1);
    
    return result?.approved_lenders || undefined;
  }
  
  // Fee Package Templates
  async getFeePackageTemplates(active?: boolean): Promise<FeePackageTemplate[]> {
    const conditions = [];
    if (active !== undefined) {
      conditions.push(eq(feePackageTemplates.isActive, active));
    }
    
    return await db.select()
      .from(feePackageTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(feePackageTemplates.displayOrder));
  }
  
  async getFeePackageTemplate(id: string): Promise<FeePackageTemplate | undefined> {
    const [template] = await db.select()
      .from(feePackageTemplates)
      .where(eq(feePackageTemplates.id, id));
    return template || undefined;
  }
}

export const storage = new DatabaseStorage();
