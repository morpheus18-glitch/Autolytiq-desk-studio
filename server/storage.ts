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
import { eq, desc, and, or, like, sql } from "drizzle-orm";

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
  
  // Trade Vehicles
  createTradeVehicle(tradeVehicle: InsertTradeVehicle): Promise<TradeVehicle>;
  
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
  
  // Trade Vehicles
  async createTradeVehicle(insertTradeVehicle: InsertTradeVehicle): Promise<TradeVehicle> {
    const [tradeVehicle] = await db.insert(tradeVehicles).values(insertTradeVehicle).returning();
    return tradeVehicle;
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
    let query = db
      .select()
      .from(taxJurisdictions)
      .leftJoin(taxRuleGroups, eq(taxJurisdictions.taxRuleGroupId, taxRuleGroups.id))
      .where(eq(taxJurisdictions.state, state));
    
    if (county) {
      query = query.where(eq(taxJurisdictions.county, county)) as any;
    }
    if (city) {
      query = query.where(eq(taxJurisdictions.city, city)) as any;
    }
    
    const [result] = await query;
    if (!result) return undefined;
    
    return {
      ...result.tax_jurisdictions,
      taxRuleGroup: result.tax_rule_groups || null
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
