/**
 * STORAGE SERVICE INTERFACE
 * Defines the contract for multi-tenant database storage operations
 *
 * SECURITY: All methods that access tenant-specific data MUST include tenantId parameter
 * EXCEPTION: Global reference data (tax jurisdictions, lenders, permissions) does NOT require tenantId
 */

import type {
  User,
  InsertUser,
  Customer,
  InsertCustomer,
  Vehicle,
  InsertVehicle,
  TradeVehicle,
  InsertTradeVehicle,
  Deal,
  InsertDeal,
  DealScenario,
  InsertDealScenario,
  DealWithRelations,
  DealStats,
  AuditLog,
  InsertAuditLog,
  TaxJurisdiction,
  InsertTaxJurisdiction,
  TaxJurisdictionWithRules,
  ZipCodeLookup,
  QuickQuote,
  InsertQuickQuote,
  QuickQuoteContact,
  InsertQuickQuoteContact,
  Lender,
  InsertLender,
  LenderProgram,
  InsertLenderProgram,
  RateRequest,
  InsertRateRequest,
  ApprovedLender,
  InsertApprovedLender,
  FeePackageTemplate,
  DealershipSettings,
  InsertDealershipSettings,
  Permission,
  SecurityAuditLog,
  InsertSecurityAuditLog,
  CustomerNote,
  InsertCustomerNote,
  CustomerHistory,
  Appointment,
  InsertAppointment,
} from '@shared/schema';

/**
 * Tenant context for operations
 */
export interface TenantContext {
  tenantId: string;
  userId?: string;
}

/**
 * Query options with pagination and sorting
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination options for list methods
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pages: number;
  currentPage: number;
}

/**
 * Storage Service Interface
 * All tenant-specific methods REQUIRE tenantId parameter for multi-tenant isolation
 */
export interface IStorage {
  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  /**
   * Get user by ID
   * @param id User UUID
   * @param tenantId Optional dealership filter for admin operations
   */
  getUser(id: string, tenantId?: string): Promise<User | undefined>;

  /**
   * Get all users for a dealership (TENANT-FILTERED)
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getUsers(tenantId: string): Promise<User[]>;

  /**
   * Get user by username (used for authentication - global lookup)
   * @param username Unique username
   */
  getUserByUsername(username: string): Promise<User | undefined>;

  /**
   * Get user by email (used for authentication - global lookup)
   * @param email Unique email
   */
  getUserByEmail(email: string): Promise<User | undefined>;

  /**
   * Get user by reset token (password reset flow - global lookup)
   * @param hashedToken Hashed reset token
   */
  getUserByResetToken(hashedToken: string): Promise<User | undefined>;

  /**
   * Create new user (TENANT-ENFORCED)
   * @param user User data
   * @param tenantId Dealership ID - REQUIRED
   */
  createUser(user: InsertUser, tenantId: string): Promise<User>;

  /**
   * Update user (TENANT-VALIDATED)
   * @param id User UUID
   * @param data Update data
   * @param tenantId Dealership ID for validation
   */
  updateUser(
    id: string,
    data: Partial<Omit<User, 'id' | 'createdAt'>>,
    tenantId: string
  ): Promise<User>;

  /**
   * Update user preferences
   * @param id User UUID
   * @param preferences User preferences object
   * @param tenantId Dealership ID for validation
   */
  updateUserPreferences(id: string, preferences: unknown, tenantId: string): Promise<User>;

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================

  /**
   * Get customer by ID (TENANT-FILTERED)
   * @param id Customer UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getCustomer(id: string, tenantId: string): Promise<Customer | undefined>;

  /**
   * Search customers (TENANT-FILTERED)
   * @param query Search query string
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  searchCustomers(query: string, tenantId: string): Promise<Customer[]>;

  /**
   * Create customer (TENANT-ENFORCED)
   * @param customer Customer data
   * @param tenantId Dealership ID - REQUIRED
   */
  createCustomer(customer: InsertCustomer, tenantId: string): Promise<Customer>;

  /**
   * Update customer (TENANT-VALIDATED)
   * @param id Customer UUID
   * @param customer Update data
   * @param tenantId Dealership ID for validation
   */
  updateCustomer(id: string, customer: Partial<InsertCustomer>, tenantId: string): Promise<Customer>;

  /**
   * Get customer history (TENANT-FILTERED)
   * @param customerId Customer UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getCustomerHistory(customerId: string, tenantId: string): Promise<CustomerHistory[]>;

  /**
   * Get customer notes (TENANT-FILTERED)
   * @param customerId Customer UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getCustomerNotes(customerId: string, tenantId: string): Promise<CustomerNote[]>;

  /**
   * Create customer note (TENANT-ENFORCED)
   * @param note Note data including customerId, userId, dealershipId
   */
  createCustomerNote(
    note: Omit<InsertCustomerNote, 'id' | 'createdAt' | 'updatedAt'> & {
      customerId: string;
      userId: string;
      dealershipId: string;
    }
  ): Promise<CustomerNote>;

  /**
   * List customers with pagination and filters (TENANT-FILTERED)
   * @param options Pagination and filter options
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  listCustomers(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    },
    tenantId: string
  ): Promise<{ customers: Customer[]; total: number; pages: number }>;

  /**
   * Get deals for a customer (TENANT-FILTERED)
   * @param customerId Customer UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getCustomerDeals(customerId: string, tenantId: string): Promise<Deal[]>;

  /**
   * Find duplicate customers (TENANT-FILTERED)
   * Searches for customers matching name, email, phone, or driver's license
   * @param searchCriteria Search criteria
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  findDuplicateCustomers(
    searchCriteria: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      driversLicenseNumber?: string;
    },
    tenantId: string
  ): Promise<Customer[]>;

  /**
   * Delete customer (soft delete by setting status to 'archived') (TENANT-VALIDATED)
   * @param id Customer UUID
   * @param tenantId Dealership ID for validation
   */
  deleteCustomer(id: string, tenantId: string): Promise<void>;

  /**
   * Get customer emails (TENANT-FILTERED)
   * @param customerId Customer UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getCustomerEmails(customerId: string, tenantId: string): Promise<any[]>;

  // ==========================================
  // VEHICLE MANAGEMENT
  // ==========================================

  /**
   * Get vehicle by ID (TENANT-FILTERED)
   * @param id Vehicle UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getVehicle(id: string, tenantId: string): Promise<Vehicle | undefined>;

  /**
   * Get vehicle by stock number (TENANT-FILTERED)
   * @param stockNumber Stock number
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getVehicleByStock(stockNumber: string, tenantId: string): Promise<Vehicle | undefined>;

  /**
   * Get vehicle by stock number (DEPRECATED - use getVehicleByStock)
   * @param stockNumber Stock number
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getVehicleByStockNumber(stockNumber: string, tenantId: string): Promise<Vehicle | undefined>;

  /**
   * Get vehicle by VIN (TENANT-FILTERED)
   * @param vin VIN number
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getVehicleByVIN(vin: string, tenantId: string): Promise<Vehicle | undefined>;

  /**
   * Check if VIN exists for dealership (TENANT-FILTERED)
   * @param vin VIN number
   * @param tenantId Dealership ID for multi-tenant filtering
   * @returns True if VIN exists, false otherwise
   */
  checkVINExists(vin: string, tenantId: string): Promise<boolean>;

  /**
   * Search vehicles (TENANT-FILTERED)
   * @param query Search query string
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  searchVehicles(query: string, tenantId: string): Promise<Vehicle[]>;

  /**
   * Create vehicle (TENANT-ENFORCED)
   * @param vehicle Vehicle data
   * @param tenantId Dealership ID - REQUIRED
   */
  createVehicle(vehicle: InsertVehicle, tenantId: string): Promise<Vehicle>;

  /**
   * Update vehicle (TENANT-VALIDATED)
   * @param id Vehicle UUID
   * @param vehicle Update data
   * @param tenantId Dealership ID for validation
   */
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>, tenantId: string): Promise<Vehicle>;

  /**
   * Update vehicle status (TENANT-VALIDATED)
   * @param stockNumber Stock number
   * @param status New status
   * @param tenantId Dealership ID for validation
   */
  updateVehicleStatus(stockNumber: string, status: string, tenantId: string): Promise<Vehicle>;

  /**
   * Get inventory with filters (TENANT-FILTERED)
   * @param options Filter and pagination options
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getInventory(
    options: {
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
    },
    tenantId: string
  ): Promise<{ vehicles: Vehicle[]; total: number; pages: number }>;

  /**
   * Search inventory with advanced filters (TENANT-FILTERED)
   * @param filters Search filters
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  searchInventory(
    filters: {
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
    },
    tenantId: string
  ): Promise<Vehicle[]>;

  // ==========================================
  // TRADE VEHICLE MANAGEMENT
  // ==========================================

  /**
   * Get trade vehicles for a deal (TENANT-FILTERED via deal)
   * @param dealId Deal UUID
   * @param tenantId Dealership ID for validation
   */
  getTradeVehiclesByDeal(dealId: string, tenantId: string): Promise<TradeVehicle[]>;

  /**
   * Get trade vehicle by ID (TENANT-FILTERED via deal)
   * @param id Trade vehicle UUID
   * @param tenantId Dealership ID for validation
   */
  getTradeVehicle(id: string, tenantId: string): Promise<TradeVehicle | undefined>;

  /**
   * Create trade vehicle (TENANT-VALIDATED via dealId)
   * @param tradeVehicle Trade vehicle data with dealId
   * @param tenantId Dealership ID for validation
   */
  createTradeVehicle(tradeVehicle: InsertTradeVehicle, tenantId: string): Promise<TradeVehicle>;

  /**
   * Update trade vehicle (TENANT-VALIDATED)
   * @param id Trade vehicle UUID
   * @param tradeVehicle Update data
   * @param tenantId Dealership ID for validation
   */
  updateTradeVehicle(
    id: string,
    tradeVehicle: Partial<InsertTradeVehicle>,
    tenantId: string
  ): Promise<TradeVehicle>;

  /**
   * Delete trade vehicle (TENANT-VALIDATED)
   * @param id Trade vehicle UUID
   * @param tenantId Dealership ID for validation
   */
  deleteTradeVehicle(id: string, tenantId: string): Promise<void>;

  // ==========================================
  // DEAL MANAGEMENT
  // ==========================================

  /**
   * Get deal by ID with relations (TENANT-FILTERED)
   * @param id Deal UUID
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getDeal(id: string, tenantId: string): Promise<DealWithRelations | undefined>;

  /**
   * Get deals with pagination and filters (TENANT-FILTERED)
   * @param options Pagination and filter options
   */
  getDeals(options: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    dealershipId: string; // tenantId embedded in options
  }): Promise<{ deals: DealWithRelations[]; total: number; pages: number }>;

  /**
   * Get deal statistics (TENANT-FILTERED)
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getDealsStats(tenantId: string): Promise<DealStats>;

  /**
   * Create deal (TENANT-ENFORCED)
   * @param deal Deal data
   * @param tenantId Dealership ID - REQUIRED
   */
  createDeal(deal: InsertDeal, tenantId: string): Promise<Deal>;

  /**
   * Update deal (TENANT-VALIDATED)
   * @param id Deal UUID
   * @param deal Update data
   * @param tenantId Dealership ID for validation
   */
  updateDeal(id: string, deal: Partial<InsertDeal>, tenantId: string): Promise<Deal>;

  /**
   * Update deal state (TENANT-VALIDATED)
   * @param id Deal UUID
   * @param state New state
   * @param tenantId Dealership ID for validation
   */
  updateDealState(id: string, state: string, tenantId: string): Promise<Deal>;

  /**
   * Attach customer to deal (TENANT-VALIDATED)
   * @param dealId Deal UUID
   * @param customerId Customer UUID
   * @param tenantId Dealership ID for validation
   */
  attachCustomerToDeal(dealId: string, customerId: string, tenantId: string): Promise<Deal>;

  /**
   * Generate unique deal number (TENANT-SPECIFIC)
   * @param tenantId Dealership ID for sequence isolation
   */
  generateDealNumber(tenantId: string): Promise<string>;

  /**
   * Generate unique stock number (TENANT-SPECIFIC)
   * @param tenantId Dealership ID for sequence isolation
   */
  generateStockNumber(tenantId: string): Promise<string>;

  // ==========================================
  // DEAL SCENARIO MANAGEMENT
  // ==========================================

  /**
   * Get scenario by ID (TENANT-FILTERED via deal)
   * @param id Scenario UUID
   * @param tenantId Dealership ID for validation
   */
  getScenario(id: string, tenantId: string): Promise<DealScenario | undefined>;

  /**
   * Create scenario (TENANT-VALIDATED via dealId)
   * @param scenario Scenario data with dealId
   * @param tenantId Dealership ID for validation
   */
  createScenario(scenario: InsertDealScenario, tenantId: string): Promise<DealScenario>;

  /**
   * Update scenario (TENANT-VALIDATED)
   * @param id Scenario UUID
   * @param scenario Update data
   * @param tenantId Dealership ID for validation
   */
  updateScenario(
    id: string,
    scenario: Partial<InsertDealScenario>,
    tenantId: string
  ): Promise<DealScenario>;

  /**
   * Delete scenario (TENANT-VALIDATED)
   * @param id Scenario UUID
   * @param tenantId Dealership ID for validation
   */
  deleteScenario(id: string, tenantId: string): Promise<void>;

  // ==========================================
  // QUICK QUOTE MANAGEMENT
  // ==========================================

  /**
   * Create quick quote (NO TENANT - public form submission)
   * @param quote Quote data
   */
  createQuickQuote(quote: InsertQuickQuote): Promise<QuickQuote>;

  /**
   * Get quick quote by ID (TENANT-FILTERED if converted to deal)
   * @param id Quote UUID
   * @param tenantId Optional dealership ID for filtering
   */
  getQuickQuote(id: string, tenantId?: string): Promise<QuickQuote | undefined>;

  /**
   * Update quick quote status (TENANT-VALIDATED)
   * @param id Quote UUID
   * @param data Status update data
   * @param tenantId Dealership ID for validation
   */
  updateQuickQuote(
    id: string,
    data: Partial<Pick<QuickQuote, 'status' | 'dealId'>>,
    tenantId: string
  ): Promise<QuickQuote>;

  /**
   * Update quick quote payload
   * @param id Quote UUID
   * @param payload Quote payload data
   * @param tenantId Dealership ID for validation
   */
  updateQuickQuotePayload(id: string, payload: unknown, tenantId: string): Promise<QuickQuote>;

  /**
   * Create quick quote contact
   * @param contact Contact data
   */
  createQuickQuoteContact(contact: InsertQuickQuoteContact): Promise<QuickQuoteContact>;

  /**
   * Update quick quote contact status
   * @param id Contact UUID
   * @param status Delivery status
   * @param sentAt Sent timestamp
   */
  updateQuickQuoteContactStatus(id: string, status: string, sentAt: Date): Promise<QuickQuoteContact>;

  // ==========================================
  // AUDIT LOG
  // ==========================================

  /**
   * Create audit log entry
   * @param log Audit log data
   */
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  /**
   * Get audit logs for a deal (TENANT-FILTERED via deal)
   * @param dealId Deal UUID
   * @param tenantId Dealership ID for validation
   */
  getDealAuditLogs(dealId: string, tenantId: string): Promise<AuditLog[]>;

  // ==========================================
  // TAX JURISDICTIONS (GLOBAL REFERENCE DATA)
  // ==========================================

  /**
   * Get all tax jurisdictions (GLOBAL - no tenant filter)
   */
  getAllTaxJurisdictions(): Promise<TaxJurisdictionWithRules[]>;

  /**
   * Get tax jurisdiction by location (GLOBAL - no tenant filter)
   * @param state State code
   * @param county Optional county name
   * @param city Optional city name
   */
  getTaxJurisdiction(
    state: string,
    county?: string,
    city?: string
  ): Promise<TaxJurisdictionWithRules | undefined>;

  /**
   * Get tax jurisdiction by ID (GLOBAL - no tenant filter)
   * @param id Jurisdiction UUID
   */
  getTaxJurisdictionById(id: string): Promise<TaxJurisdictionWithRules | undefined>;

  /**
   * Get zip code lookup (GLOBAL - no tenant filter)
   * @param zipCode ZIP code
   */
  getZipCodeLookup(zipCode: string): Promise<ZipCodeLookup | undefined>;

  /**
   * Create tax jurisdiction (ADMIN ONLY)
   * @param jurisdiction Jurisdiction data
   */
  createTaxJurisdiction(jurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction>;

  // ==========================================
  // LENDER MANAGEMENT (GLOBAL REFERENCE DATA)
  // ==========================================

  /**
   * Get all lenders (GLOBAL - no tenant filter)
   * @param active Optional filter by active status
   */
  getLenders(active?: boolean): Promise<Lender[]>;

  /**
   * Get lender by ID (GLOBAL - no tenant filter)
   * @param id Lender UUID
   */
  getLender(id: string): Promise<Lender | undefined>;

  /**
   * Create lender (ADMIN ONLY)
   * @param lender Lender data
   */
  createLender(lender: InsertLender): Promise<Lender>;

  /**
   * Update lender (ADMIN ONLY)
   * @param id Lender UUID
   * @param lender Update data
   */
  updateLender(id: string, lender: Partial<InsertLender>): Promise<Lender>;

  /**
   * Get lender programs (GLOBAL - no tenant filter)
   * @param lenderId Lender UUID
   * @param active Optional filter by active status
   */
  getLenderPrograms(lenderId: string, active?: boolean): Promise<LenderProgram[]>;

  /**
   * Get lender program by ID (GLOBAL - no tenant filter)
   * @param id Program UUID
   */
  getLenderProgram(id: string): Promise<LenderProgram | undefined>;

  /**
   * Create lender program (ADMIN ONLY)
   * @param program Program data
   */
  createLenderProgram(program: InsertLenderProgram): Promise<LenderProgram>;

  /**
   * Update lender program (ADMIN ONLY)
   * @param id Program UUID
   * @param program Update data
   */
  updateLenderProgram(id: string, program: Partial<InsertLenderProgram>): Promise<LenderProgram>;

  // ==========================================
  // RATE REQUEST MANAGEMENT
  // ==========================================

  /**
   * Create rate request (TENANT-VALIDATED via dealId)
   * @param request Rate request data with dealId
   * @param tenantId Dealership ID for validation
   */
  createRateRequest(request: InsertRateRequest, tenantId: string): Promise<RateRequest>;

  /**
   * Get rate request by ID (TENANT-FILTERED via deal)
   * @param id Rate request UUID
   * @param tenantId Dealership ID for validation
   */
  getRateRequest(id: string, tenantId: string): Promise<RateRequest | undefined>;

  /**
   * Get rate requests by deal (TENANT-FILTERED)
   * @param dealId Deal UUID
   * @param tenantId Dealership ID for validation
   */
  getRateRequestsByDeal(dealId: string, tenantId: string): Promise<RateRequest[]>;

  /**
   * Update rate request (TENANT-VALIDATED)
   * @param id Rate request UUID
   * @param request Update data
   * @param tenantId Dealership ID for validation
   */
  updateRateRequest(
    id: string,
    request: Partial<InsertRateRequest>,
    tenantId: string
  ): Promise<RateRequest>;

  // ==========================================
  // APPROVED LENDER MANAGEMENT
  // ==========================================

  /**
   * Create approved lenders (TENANT-VALIDATED via rate request)
   * @param lenders Approved lender data array
   * @param tenantId Dealership ID for validation
   */
  createApprovedLenders(lenders: InsertApprovedLender[], tenantId: string): Promise<ApprovedLender[]>;

  /**
   * Get approved lenders for rate request (TENANT-FILTERED via rate request)
   * @param rateRequestId Rate request UUID
   * @param tenantId Dealership ID for validation
   */
  getApprovedLenders(rateRequestId: string, tenantId: string): Promise<ApprovedLender[]>;

  /**
   * Select approved lender (TENANT-VALIDATED)
   * @param id Approved lender UUID
   * @param userId User who selected
   * @param tenantId Dealership ID for validation
   */
  selectApprovedLender(id: string, userId: string, tenantId: string): Promise<ApprovedLender>;

  /**
   * Get selected lender for deal (TENANT-FILTERED)
   * @param dealId Deal UUID
   * @param tenantId Dealership ID for validation
   */
  getSelectedLenderForDeal(dealId: string, tenantId: string): Promise<ApprovedLender | undefined>;

  // ==========================================
  // FEE PACKAGE TEMPLATES (GLOBAL REFERENCE DATA)
  // ==========================================

  /**
   * Get fee package templates (GLOBAL - no tenant filter)
   * @param active Optional filter by active status
   */
  getFeePackageTemplates(active?: boolean): Promise<FeePackageTemplate[]>;

  /**
   * Get fee package template by ID (GLOBAL - no tenant filter)
   * @param id Template UUID
   */
  getFeePackageTemplate(id: string): Promise<FeePackageTemplate | undefined>;

  // ==========================================
  // DEALERSHIP SETTINGS
  // ==========================================

  /**
   * Get dealership settings (TENANT-SPECIFIC)
   * @param tenantId Dealership ID
   */
  getDealershipSettings(tenantId: string): Promise<DealershipSettings | undefined>;

  /**
   * Update dealership settings (TENANT-VALIDATED)
   * @param id Settings UUID
   * @param settings Update data
   * @param tenantId Dealership ID for validation
   */
  updateDealershipSettings(
    id: string,
    settings: Partial<InsertDealershipSettings>,
    tenantId: string
  ): Promise<DealershipSettings>;

  // ==========================================
  // PERMISSIONS & RBAC (GLOBAL)
  // ==========================================

  /**
   * Get all permissions (GLOBAL - no tenant filter)
   */
  getPermissions(): Promise<Permission[]>;

  /**
   * Get permission by name (GLOBAL - no tenant filter)
   * @param name Permission name
   */
  getPermission(name: string): Promise<Permission | undefined>;

  /**
   * Get permissions for a role (GLOBAL - no tenant filter)
   * @param role Role name
   */
  getRolePermissions(role: string): Promise<Permission[]>;

  // ==========================================
  // SECURITY AUDIT LOG
  // ==========================================

  /**
   * Create security audit log entry
   * @param log Security audit data
   */
  createSecurityAuditLog(
    log: Omit<InsertSecurityAuditLog, 'id' | 'createdAt'>
  ): Promise<SecurityAuditLog>;

  /**
   * Get security audit logs (TENANT-FILTERED via user)
   * @param options Filter options
   * @param tenantId Optional dealership ID for filtering
   */
  getSecurityAuditLogs(
    options: { userId?: string; eventType?: string; limit?: number },
    tenantId?: string
  ): Promise<SecurityAuditLog[]>;

  // ==========================================
  // APPOINTMENT MANAGEMENT
  // ==========================================

  /**
   * Get appointments by date (TENANT-FILTERED)
   * @param date Target date
   * @param tenantId Dealership ID for multi-tenant filtering
   */
  getAppointmentsByDate(date: Date, tenantId: string): Promise<Appointment[]>;

  /**
   * Get appointments with filters (TENANT-FILTERED)
   * @param tenantId Dealership ID for multi-tenant filtering
   * @param options Filter options
   */
  getAppointments(
    tenantId: string,
    options?: { startDate?: Date; endDate?: Date; userId?: string; customerId?: string }
  ): Promise<Appointment[]>;

  /**
   * Create appointment (TENANT-ENFORCED)
   * @param appointment Appointment data including dealershipId
   */
  createAppointment(
    appointment: Omit<InsertAppointment, 'id' | 'createdAt' | 'updatedAt'> & { dealershipId: string }
  ): Promise<Appointment>;

  /**
   * Update appointment (TENANT-VALIDATED)
   * @param id Appointment UUID
   * @param appointment Update data
   * @param tenantId Dealership ID for validation
   */
  updateAppointment(
    id: string,
    appointment: Partial<InsertAppointment>,
    tenantId: string
  ): Promise<Appointment>;

  /**
   * Delete appointment (TENANT-VALIDATED)
   * @param id Appointment UUID
   * @param tenantId Dealership ID for validation
   */
  deleteAppointment(id: string, tenantId: string): Promise<void>;

  // Session store (backward compatibility)
  sessionStore: unknown;
}
