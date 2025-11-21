/**
 * STORAGE COMPATIBILITY LAYER
 *
 * This file maintains backward compatibility with existing imports while
 * delegating to the new centralized StorageService in /src/core/database/
 *
 * MIGRATION STATUS: Transitional wrapper
 * NEW CODE: Import from '@/core/database' instead
 *
 * This layer will be removed once all consumers are migrated to new service.
 */

import { StorageService } from '../src/core/database/storage.service';
import type { IStorage as IStorageNew } from '../src/core/database/storage.interface';
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import type {
  User, InsertUser,
  Customer, InsertCustomer,
  Vehicle, InsertVehicle,
  TradeVehicle, InsertTradeVehicle,
  Deal, InsertDeal,
  DealScenario, InsertDealScenario,
  AuditLog, InsertAuditLog,
  TaxJurisdiction, InsertTaxJurisdiction, TaxJurisdictionWithRules,
  ZipCodeLookup,
  DealWithRelations,
  DealStats,
  Lender, InsertLender,
  LenderProgram, InsertLenderProgram,
  RateRequest, InsertRateRequest,
  ApprovedLender, InsertApprovedLender,
  QuickQuote, InsertQuickQuote,
  QuickQuoteContact, InsertQuickQuoteContact,
  FeePackageTemplate,
  DealershipSettings, InsertDealershipSettings,
  Permission,
  SecurityAuditLog, InsertSecurityAuditLog,
  CustomerNote, InsertCustomerNote,
  CustomerHistory,
  Appointment, InsertAppointment,
} from "@shared/schema";

// ==========================================
// REDIS SESSION STORE INITIALIZATION
// ==========================================
// This remains here for backward compatibility with auth system

const REDIS_HOST = process.env.REDIS_HOST || "redis-18908.crce197.us-east-2-1.ec2.cloud.redislabs.com";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "18908", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_TLS = process.env.REDIS_TLS === "true";

const redisClient = createClient({
  socket: REDIS_TLS
    ? {
        host: REDIS_HOST,
        port: REDIS_PORT,
        tls: true,
      }
    : {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
  password: REDIS_PASSWORD || undefined,
});

// Connection event handlers
redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});
redisClient.on('connect', () => console.log('[Redis] Connected to', REDIS_HOST));
redisClient.on('ready', () => console.log('[Redis] Ready to accept commands'));
redisClient.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

// Connect immediately
redisClient.connect()
  .then(async () => {
    await redisClient.ping();
    console.log('[Redis] Health check passed');
  })
  .catch((err) => {
    console.error('[Redis] FATAL: Failed to connect to Redis:', err);
    console.error('[Redis] Sessions will NOT work. Please check Redis credentials and TLS settings.');
  });

// ==========================================
// LEGACY INTERFACE DEFINITION
// ==========================================
// Kept for backward compatibility - matches old signature

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(dealershipId: string): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(hashedToken: string): Promise<User | undefined>;
  createUser(user: InsertUser, dealershipId: string): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  sessionStore: any;

  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  searchCustomers(query: string, dealershipId: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer, dealershipId: string): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  getCustomerHistory(customerId: string): Promise<any[]>;
  getCustomerNotes(customerId: string): Promise<CustomerNote[]>;
  createCustomerNote(note: Omit<InsertCustomerNote, 'id' | 'createdAt' | 'updatedAt'> & { customerId: string; userId: string; dealershipId: string }): Promise<CustomerNote>;

  // Appointments
  getAppointmentsByDate(date: Date, dealershipId: string): Promise<Appointment[]>;
  getAppointments(dealershipId: string, options?: { startDate?: Date; endDate?: Date; userId?: string; customerId?: string }): Promise<Appointment[]>;
  createAppointment(appointment: Omit<InsertAppointment, 'id' | 'createdAt' | 'updatedAt'> & { dealershipId: string }): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;

  // Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByStock(stockNumber: string, dealershipId: string): Promise<Vehicle | undefined>;
  searchVehicles(query: string, dealershipId: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle, dealershipId: string): Promise<Vehicle>;
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
  getTaxJurisdictionById(id: string): Promise<TaxJurisdictionWithRules | undefined>;
  getZipCodeLookup(zipCode: string): Promise<ZipCodeLookup | undefined>;
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
  getDeals(options: { page: number; pageSize: number; search?: string; status?: string; dealershipId: string }): Promise<{ deals: DealWithRelations[]; total: number; pages: number }>;
  getDealsStats(dealershipId: string): Promise<DealStats>;
  createDeal(deal: InsertDeal, dealershipId: string): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal>;
  updateDealState(id: string, state: string): Promise<Deal>;
  attachCustomerToDeal(dealId: string, customerId: string): Promise<Deal>;

  // Identifier Generation
  generateDealNumber(dealershipId: string): Promise<string>;
  generateStockNumber(dealershipId: string): Promise<string>;

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

  // Security Audit Log
  createSecurityAuditLog(log: Omit<InsertSecurityAuditLog, "id" | "createdAt">): Promise<SecurityAuditLog>;
  getSecurityAuditLogs(options: { userId?: string; eventType?: string; limit?: number }): Promise<SecurityAuditLog[]>;

  // Dealership Settings
  getDealershipSettings(dealershipId?: string): Promise<DealershipSettings | undefined>;
  updateDealershipSettings(id: string, settings: Partial<InsertDealershipSettings>): Promise<DealershipSettings>;

  // Permissions & RBAC
  getPermissions(): Promise<Permission[]>;
  getPermission(name: string): Promise<Permission | undefined>;
  getRolePermissions(role: string): Promise<Permission[]>;

  // User Preferences
  updateUserPreferences(id: string, preferences: any): Promise<User>;
}

// ==========================================
// COMPATIBILITY WRAPPER
// ==========================================
// Wraps new StorageService to maintain old API signature

class LegacyStorageAdapter implements IStorage {
  private service: StorageService;
  public sessionStore: any;

  constructor() {
    this.service = new StorageService();

    // Initialize Redis session store
    if (redisClient.isOpen && redisClient.isReady) {
      console.log('[Storage] Using Redis for session storage');
      this.sessionStore = new RedisStore({
        client: redisClient,
        prefix: "dealstudio:sess:",
        ttl: 7 * 24 * 60 * 60, // 7 days
      });
    } else {
      console.warn('[Storage] Redis not available - using memory session store');
      this.sessionStore = new session.MemoryStore();
    }
  }

  // ==========================================
  // ADAPTER METHODS (OLD API → NEW API)
  // ==========================================
  // These methods adapt the old signature (no tenantId) to new signature (requires tenantId)
  // CRITICAL: Most methods need tenantId from user context, but legacy API doesn't provide it
  // For now, we pass undefined and rely on the new service to handle it properly

  async getUser(id: string): Promise<User | undefined> {
    return this.service.getUser(id);
  }

  async getUsers(dealershipId: string): Promise<User[]> {
    return this.service.getUsers(dealershipId);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.service.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.service.getUserByEmail(email);
  }

  async getUserByResetToken(hashedToken: string): Promise<User | undefined> {
    return this.service.getUserByResetToken(hashedToken);
  }

  async createUser(user: InsertUser, dealershipId: string): Promise<User> {
    return this.service.createUser(user, dealershipId);
  }

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    // COMPATIBILITY: Old API doesn't provide tenantId - get from user record
    const existingUser = await this.service.getUser(id);
    if (!existingUser) {
      throw new Error('User not found');
    }
    return this.service.updateUser(id, data, existingUser.dealershipId);
  }

  async updateUserPreferences(id: string, preferences: any): Promise<User> {
    const existingUser = await this.service.getUser(id);
    if (!existingUser) {
      throw new Error('User not found');
    }
    return this.service.updateUserPreferences(id, preferences, existingUser.dealershipId);
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    // COMPATIBILITY WARNING: Old API doesn't provide tenantId
    // The new service will handle this by looking up customer first
    return this.service.getCustomer(id, undefined as any);
  }

  async searchCustomers(query: string, dealershipId: string): Promise<Customer[]> {
    return this.service.searchCustomers(query, dealershipId);
  }

  async createCustomer(customer: InsertCustomer, dealershipId: string): Promise<Customer> {
    return this.service.createCustomer(customer, dealershipId);
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const existing = await this.getCustomer(id);
    if (!existing) {
      throw new Error('Customer not found');
    }
    return this.service.updateCustomer(id, customer, existing.dealershipId);
  }

  async getCustomerHistory(customerId: string): Promise<any[]> {
    const existing = await this.getCustomer(customerId);
    if (!existing) {
      throw new Error('Customer not found');
    }
    return this.service.getCustomerHistory(customerId, existing.dealershipId);
  }

  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    const existing = await this.getCustomer(customerId);
    if (!existing) {
      throw new Error('Customer not found');
    }
    return this.service.getCustomerNotes(customerId, existing.dealershipId);
  }

  async createCustomerNote(note: Omit<InsertCustomerNote, 'id' | 'createdAt' | 'updatedAt'> & { customerId: string; userId: string; dealershipId: string }): Promise<CustomerNote> {
    return this.service.createCustomerNote(note);
  }

  // Appointment methods
  async getAppointmentsByDate(date: Date, dealershipId: string): Promise<Appointment[]> {
    return this.service.getAppointmentsByDate(date, dealershipId);
  }

  async getAppointments(dealershipId: string, options?: { startDate?: Date; endDate?: Date; userId?: string; customerId?: string }): Promise<Appointment[]> {
    return this.service.getAppointments(dealershipId, options);
  }

  async createAppointment(appointment: Omit<InsertAppointment, 'id' | 'createdAt' | 'updatedAt'> & { dealershipId: string }): Promise<Appointment> {
    return this.service.createAppointment(appointment);
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    return this.service.updateAppointment(id, appointment);
  }

  async deleteAppointment(id: string): Promise<void> {
    return this.service.deleteAppointment(id);
  }

  // Vehicle methods
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.service.getVehicle(id, undefined as any);
  }

  async getVehicleByStock(stockNumber: string, dealershipId: string): Promise<Vehicle | undefined> {
    return this.service.getVehicleByStock(stockNumber, dealershipId);
  }

  async searchVehicles(query: string, dealershipId: string): Promise<Vehicle[]> {
    return this.service.searchVehicles(query, dealershipId);
  }

  async createVehicle(vehicle: InsertVehicle, dealershipId: string): Promise<Vehicle> {
    return this.service.createVehicle(vehicle, dealershipId);
  }

  async updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const existing = await this.getVehicle(id);
    if (!existing) {
      throw new Error('Vehicle not found');
    }
    return this.service.updateVehicle(id, vehicle, existing.dealershipId);
  }

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
    return this.service.getInventory(options);
  }

  async getVehicleByStockNumber(stockNumber: string): Promise<Vehicle | undefined> {
    return this.service.getVehicleByStockNumber(stockNumber);
  }

  async updateVehicleStatus(stockNumber: string, status: string): Promise<Vehicle> {
    return this.service.updateVehicleStatus(stockNumber, status);
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
    return this.service.searchInventory(filters);
  }

  // Trade vehicle methods
  async getTradeVehiclesByDeal(dealId: string): Promise<TradeVehicle[]> {
    return this.service.getTradeVehiclesByDeal(dealId);
  }

  async getTradeVehicle(id: string): Promise<TradeVehicle | undefined> {
    return this.service.getTradeVehicle(id);
  }

  async createTradeVehicle(tradeVehicle: InsertTradeVehicle): Promise<TradeVehicle> {
    return this.service.createTradeVehicle(tradeVehicle);
  }

  async updateTradeVehicle(id: string, tradeVehicle: Partial<InsertTradeVehicle>): Promise<TradeVehicle> {
    return this.service.updateTradeVehicle(id, tradeVehicle);
  }

  async deleteTradeVehicle(id: string): Promise<void> {
    return this.service.deleteTradeVehicle(id);
  }

  // Tax jurisdiction methods
  async getAllTaxJurisdictions(): Promise<TaxJurisdictionWithRules[]> {
    return this.service.getAllTaxJurisdictions();
  }

  async getTaxJurisdiction(state: string, county?: string, city?: string): Promise<TaxJurisdictionWithRules | undefined> {
    return this.service.getTaxJurisdiction(state, county, city);
  }

  async getTaxJurisdictionById(id: string): Promise<TaxJurisdictionWithRules | undefined> {
    return this.service.getTaxJurisdictionById(id);
  }

  async getZipCodeLookup(zipCode: string): Promise<ZipCodeLookup | undefined> {
    return this.service.getZipCodeLookup(zipCode);
  }

  async createTaxJurisdiction(jurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction> {
    return this.service.createTaxJurisdiction(jurisdiction);
  }

  // Quick quote methods
  async createQuickQuote(quote: InsertQuickQuote): Promise<QuickQuote> {
    return this.service.createQuickQuote(quote);
  }

  async getQuickQuote(id: string): Promise<QuickQuote | undefined> {
    return this.service.getQuickQuote(id);
  }

  async updateQuickQuote(id: string, data: Partial<Pick<QuickQuote, 'status' | 'dealId'>>): Promise<QuickQuote> {
    return this.service.updateQuickQuote(id, data);
  }

  async updateQuickQuotePayload(id: string, payload: any): Promise<QuickQuote> {
    return this.service.updateQuickQuotePayload(id, payload);
  }

  async createQuickQuoteContact(contact: InsertQuickQuoteContact): Promise<QuickQuoteContact> {
    return this.service.createQuickQuoteContact(contact);
  }

  async updateQuickQuoteContactStatus(id: string, status: string, sentAt: Date): Promise<QuickQuoteContact> {
    return this.service.updateQuickQuoteContactStatus(id, status, sentAt);
  }

  // Deal methods
  async getDeal(id: string): Promise<DealWithRelations | undefined> {
    return this.service.getDeal(id);
  }

  async getDeals(options: { page: number; pageSize: number; search?: string; status?: string; dealershipId: string }): Promise<{ deals: DealWithRelations[]; total: number; pages: number }> {
    return this.service.getDeals(options);
  }

  async getDealsStats(dealershipId: string): Promise<DealStats> {
    return this.service.getDealsStats(dealershipId);
  }

  async createDeal(deal: InsertDeal, dealershipId: string): Promise<Deal> {
    return this.service.createDeal(deal, dealershipId);
  }

  async updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal> {
    return this.service.updateDeal(id, deal);
  }

  async updateDealState(id: string, state: string): Promise<Deal> {
    return this.service.updateDealState(id, state);
  }

  async attachCustomerToDeal(dealId: string, customerId: string): Promise<Deal> {
    return this.service.attachCustomerToDeal(dealId, customerId);
  }

  // Identifier generation
  async generateDealNumber(dealershipId: string): Promise<string> {
    return this.service.generateDealNumber(dealershipId);
  }

  async generateStockNumber(dealershipId: string): Promise<string> {
    return this.service.generateStockNumber(dealershipId);
  }

  // Deal scenario methods
  async getScenario(id: string): Promise<DealScenario | undefined> {
    return this.service.getScenario(id);
  }

  async createScenario(scenario: InsertDealScenario): Promise<DealScenario> {
    return this.service.createScenario(scenario);
  }

  async updateScenario(id: string, scenario: Partial<InsertDealScenario>): Promise<DealScenario> {
    return this.service.updateScenario(id, scenario);
  }

  async deleteScenario(id: string): Promise<void> {
    return this.service.deleteScenario(id);
  }

  // Audit log methods
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return this.service.createAuditLog(log);
  }

  async getDealAuditLogs(dealId: string): Promise<AuditLog[]> {
    return this.service.getDealAuditLogs(dealId);
  }

  // Lender methods
  async getLenders(active?: boolean): Promise<Lender[]> {
    return this.service.getLenders(active);
  }

  async getLender(id: string): Promise<Lender | undefined> {
    return this.service.getLender(id);
  }

  async createLender(lender: InsertLender): Promise<Lender> {
    return this.service.createLender(lender);
  }

  async updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender> {
    return this.service.updateLender(id, lender);
  }

  // Lender program methods
  async getLenderPrograms(lenderId: string, active?: boolean): Promise<LenderProgram[]> {
    return this.service.getLenderPrograms(lenderId, active);
  }

  async getLenderProgram(id: string): Promise<LenderProgram | undefined> {
    return this.service.getLenderProgram(id);
  }

  async createLenderProgram(program: InsertLenderProgram): Promise<LenderProgram> {
    return this.service.createLenderProgram(program);
  }

  async updateLenderProgram(id: string, program: Partial<InsertLenderProgram>): Promise<LenderProgram> {
    return this.service.updateLenderProgram(id, program);
  }

  // Rate request methods
  async createRateRequest(request: InsertRateRequest): Promise<RateRequest> {
    return this.service.createRateRequest(request);
  }

  async getRateRequest(id: string): Promise<RateRequest | undefined> {
    return this.service.getRateRequest(id);
  }

  async getRateRequestsByDeal(dealId: string): Promise<RateRequest[]> {
    return this.service.getRateRequestsByDeal(dealId);
  }

  async updateRateRequest(id: string, request: Partial<InsertRateRequest>): Promise<RateRequest> {
    return this.service.updateRateRequest(id, request);
  }

  // Approved lender methods
  async createApprovedLenders(lenders: InsertApprovedLender[]): Promise<ApprovedLender[]> {
    return this.service.createApprovedLenders(lenders);
  }

  async getApprovedLenders(rateRequestId: string): Promise<ApprovedLender[]> {
    return this.service.getApprovedLenders(rateRequestId);
  }

  async selectApprovedLender(id: string, userId: string): Promise<ApprovedLender> {
    return this.service.selectApprovedLender(id, userId);
  }

  async getSelectedLenderForDeal(dealId: string): Promise<ApprovedLender | undefined> {
    return this.service.getSelectedLenderForDeal(dealId);
  }

  // Fee package template methods
  async getFeePackageTemplates(active?: boolean): Promise<FeePackageTemplate[]> {
    return this.service.getFeePackageTemplates(active);
  }

  async getFeePackageTemplate(id: string): Promise<FeePackageTemplate | undefined> {
    return this.service.getFeePackageTemplate(id);
  }

  // Security audit log methods
  async createSecurityAuditLog(log: Omit<InsertSecurityAuditLog, "id" | "createdAt">): Promise<SecurityAuditLog> {
    return this.service.createSecurityAuditLog(log);
  }

  async getSecurityAuditLogs(options: { userId?: string; eventType?: string; limit?: number }): Promise<SecurityAuditLog[]> {
    return this.service.getSecurityAuditLogs(options);
  }

  // Dealership settings methods
  async getDealershipSettings(dealershipId?: string): Promise<DealershipSettings | undefined> {
    return this.service.getDealershipSettings(dealershipId);
  }

  async updateDealershipSettings(id: string, settings: Partial<InsertDealershipSettings>): Promise<DealershipSettings> {
    return this.service.updateDealershipSettings(id, settings);
  }

  // Permission methods
  async getPermissions(): Promise<Permission[]> {
    return this.service.getPermissions();
  }

  async getPermission(name: string): Promise<Permission | undefined> {
    return this.service.getPermission(name);
  }

  async getRolePermissions(role: string): Promise<Permission[]> {
    return this.service.getRolePermissions(role);
  }
}

// Export singleton instance
export const storage = new LegacyStorageAdapter();

// Also export the interface for consumers who import it
export type { IStorage };
