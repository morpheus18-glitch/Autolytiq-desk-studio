// Referenced from javascript_database blueprint integration
import { 
  users, customers, vehicles, tradeVehicles, deals, dealScenarios, auditLog, taxJurisdictions, taxRuleGroups,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Vehicle, type InsertVehicle,
  type TradeVehicle, type InsertTradeVehicle,
  type Deal, type InsertDeal,
  type DealScenario, type InsertDealScenario,
  type AuditLog, type InsertAuditLog,
  type TaxJurisdiction, type InsertTaxJurisdiction, type TaxJurisdictionWithRules,
  type DealWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, gte, lte, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  
  // Deals
  getDeal(id: string): Promise<DealWithRelations | undefined>;
  getDeals(options: { page: number; pageSize: number; search?: string; status?: string }): Promise<{ deals: DealWithRelations[]; total: number; pages: number }>;
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
}

export class DatabaseStorage implements IStorage {
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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
}

export const storage = new DatabaseStorage();
