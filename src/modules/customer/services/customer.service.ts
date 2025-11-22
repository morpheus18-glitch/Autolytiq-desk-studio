/**
 * CUSTOMER SERVICE
 * Core business logic for customer management
 *
 * CRITICAL FEATURES:
 * - Multi-tenant isolation (EVERY query filters by dealershipId)
 * - Soft delete (preserves history)
 * - Fast search with indexes
 * - Duplicate detection
 * - Customer timeline aggregation
 */

import { db } from '../../../core/database/index';
import { customers, deals, emailMessages, customerNotes } from '@shared/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import type {
  CustomerNote,
  InsertCustomerNote,
  InsertCustomer,
  Customer as DbCustomer
} from '@shared/schema';
import { StorageService } from '../../../core/database/storage.service';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerListQuery,
  PaginatedCustomers,
  DuplicateSearch,
  TimelineEvent,
  ValidationResult,
} from '../types/customer.types';
import {
  CustomerNotFoundError,
  CustomerValidationError,
  CustomerAccessDeniedError,
  DuplicateCustomerError,
} from '../types/customer.types';
import { validateCustomerData, normalizePhone, normalizeEmail } from '../utils/validators';

/**
 * Customer Service Class
 */
export class CustomerService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  // ========================================================================
  // CREATE
  // ========================================================================

  /**
   * Create a new customer
   * Validates data, checks for duplicates, enforces multi-tenant isolation
   */
  async createCustomer(
    data: CreateCustomerRequest,
    dealershipId: string,
    userId?: string
  ): Promise<Customer> {
    // Validate customer data
    const validation = validateCustomerData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      driversLicenseNumber: data.driversLicense?.number,
      driversLicenseState: data.driversLicense?.state,
      ssnLast4: data.ssnLast4,
    });

    if (!validation.valid) {
      throw new CustomerValidationError(
        'Customer validation failed',
        validation.errors
      );
    }

    // Check for duplicates
    const duplicates = await this.findDuplicates({
      dealershipId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      driversLicenseNumber: data.driversLicense?.number,
    });

    if (duplicates.length > 0) {
      throw new DuplicateCustomerError(
        'Potential duplicate customers found. Please review before creating.',
        duplicates
      );
    }

    // Create customer using StorageService
    const insertData: InsertCustomer = {
      dealershipId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ? normalizeEmail(data.email) : null,
      phone: data.phone ? normalizePhone(data.phone) : null,
      address: data.address?.street || null,
      city: data.address?.city || null,
      state: data.address?.state || null,
      zipCode: data.address?.zipCode || null,
      county: data.address?.county || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      driversLicenseNumber: data.driversLicense?.number || null,
      driversLicenseState: data.driversLicense?.state || null,
      ssnLast4: data.ssnLast4 || null,
      employer: data.employer || null,
      occupation: data.occupation || null,
      monthlyIncome: data.monthlyIncome?.toString() || null,
      creditScore: data.creditScore || null,
      status: data.status,
      preferredContactMethod: data.preferredContactMethod || 'email',
      marketingOptIn: data.marketingOptIn ?? false,
      notes: data.notes || null,
      photoUrl: data.photoUrl || null,
      currentVehicleYear: data.currentVehicle?.year || null,
      currentVehicleMake: data.currentVehicle?.make || null,
      currentVehicleModel: data.currentVehicle?.model || null,
      currentVehicleTrim: data.currentVehicle?.trim || null,
      currentVehicleVin: data.currentVehicle?.vin || null,
      currentVehicleMileage: data.currentVehicle?.mileage || null,
      currentVehicleColor: data.currentVehicle?.color || null,
      tradeAllowance: data.tradeIn?.allowance?.toString() || null,
      tradeACV: data.tradeIn?.actualCashValue?.toString() || null,
      tradePayoff: data.tradeIn?.payoffAmount?.toString() || null,
      tradePayoffTo: data.tradeIn?.payoffLender || null,
    };

    const customer = await this.storageService.createCustomer(insertData, dealershipId);

    return this.mapToCustomer(customer);
  }

  // ========================================================================
  // READ
  // ========================================================================

  /**
   * Get customer by ID
   * Enforces multi-tenant isolation and soft delete filtering
   */
  async getCustomer(customerId: string, dealershipId: string): Promise<Customer> {
    const customer = await this.storageService.getCustomer(customerId, dealershipId);

    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    return this.mapToCustomer(customer);
  }

  /**
   * List customers with filters and pagination
   * Uses StorageService for basic listing, handles advanced filters locally
   */
  async listCustomers(query: CustomerListQuery): Promise<PaginatedCustomers> {
    const {
      dealershipId,
      status,
      source,
      assignedSalespersonId,
      tags,
      search,
      createdFrom,
      createdTo,
      lastContactFrom,
      lastContactTo,
      needsFollowUp,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = query;

    // If only basic filters are used, delegate to StorageService
    const hasAdvancedFilters =
      source ||
      assignedSalespersonId ||
      tags ||
      createdFrom ||
      createdTo ||
      lastContactFrom ||
      lastContactTo ||
      needsFollowUp ||
      includeDeleted ||
      sortBy !== 'createdAt';

    if (!hasAdvancedFilters) {
      // Use StorageService for simple queries
      const result = await this.storageService.listCustomers(
        {
          page,
          pageSize: limit,
          search,
          status,
        },
        dealershipId
      );

      return {
        customers: result.customers.map((c) => this.mapToCustomer(c)),
        total: result.total,
        page,
        limit,
        totalPages: result.pages,
        hasMore: page < result.pages,
      };
    }

    // Fall back to direct DB queries for advanced filters
    const conditions = [eq(customers.dealershipId, dealershipId)];

    // Status filter
    if (status) {
      conditions.push(eq(customers.status, status));
    }

    // Search (name, email, phone, customer number)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${customers.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${customers.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(${customers.email}) LIKE ${searchTerm}`,
          sql`${customers.phone} LIKE ${searchTerm}`,
          sql`${customers.customerNumber} LIKE ${searchTerm}`
        )!
      );
    }

    // Date filters
    if (createdFrom) {
      conditions.push(sql`${customers.createdAt} >= ${new Date(createdFrom)}`);
    }

    if (createdTo) {
      conditions.push(sql`${customers.createdAt} <= ${new Date(createdTo)}`);
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(and(...conditions));

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Sort order
    const orderByColumn =
      sortBy === 'lastName'
        ? customers.lastName
        : sortBy === 'customerNumber'
        ? customers.customerNumber
        : sortBy === 'updatedAt'
        ? customers.updatedAt
        : customers.createdAt;

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Get customers
    const customerList = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(orderFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    return {
      customers: customerList.map((c) => this.mapToCustomer(c)),
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  // ========================================================================
  // UPDATE
  // ========================================================================

  /**
   * Update customer
   * Validates changes and enforces multi-tenant isolation
   */
  async updateCustomer(
    customerId: string,
    dealershipId: string,
    data: UpdateCustomerRequest
  ): Promise<Customer> {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    // Validate updated data
    if (data.firstName || data.lastName || data.email || data.phone) {
      const validation = validateCustomerData({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
      });

      if (!validation.valid) {
        throw new CustomerValidationError(
          'Customer validation failed',
          validation.errors
        );
      }
    }

    // Build update object
    const updateData: Partial<InsertCustomer> = {};

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = normalizeEmail(data.email);
    if (data.phone) updateData.phone = normalizePhone(data.phone);
    if (data.address) {
      updateData.address = data.address.street;
      updateData.city = data.address.city;
      updateData.state = data.address.state;
      updateData.zipCode = data.address.zipCode;
      updateData.county = data.address.county;
    }
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.creditScore) updateData.creditScore = data.creditScore;
    if (data.monthlyIncome) updateData.monthlyIncome = data.monthlyIncome.toString();
    if (data.preferredContactMethod) {
      updateData.preferredContactMethod = data.preferredContactMethod;
    }

    // Update customer using StorageService
    const updated = await this.storageService.updateCustomer(
      customerId,
      updateData,
      dealershipId
    );

    return this.mapToCustomer(updated);
  }

  // ========================================================================
  // DELETE (SOFT DELETE)
  // ========================================================================

  /**
   * Soft delete customer (preserves history)
   * Delegates to StorageService for tenant-validated soft delete
   */
  async deleteCustomer(customerId: string, dealershipId: string): Promise<void> {
    await this.storageService.deleteCustomer(customerId, dealershipId);
  }

  // ========================================================================
  // SEARCH
  // ========================================================================

  /**
   * Fast customer search (name, email, phone)
   * Uses database indexes for performance
   */
  async searchCustomers(searchQuery: string, dealershipId: string): Promise<Customer[]> {
    if (!searchQuery || !searchQuery.trim()) {
      return [];
    }

    const results = await this.storageService.searchCustomers(searchQuery, dealershipId);

    return results.map((c) => this.mapToCustomer(c));
  }

  // ========================================================================
  // DUPLICATE DETECTION
  // ========================================================================

  /**
   * Find potential duplicate customers
   * Checks: name match, phone match, email match, driver's license match
   * Delegates to StorageService for tenant-filtered duplicate detection
   */
  async findDuplicates(search: DuplicateSearch): Promise<Customer[]> {
    const { dealershipId, firstName, lastName, email, phone, driversLicenseNumber } =
      search;

    // Normalize phone and email before searching
    const searchCriteria: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      driversLicenseNumber?: string;
    } = {};

    if (firstName) searchCriteria.firstName = firstName;
    if (lastName) searchCriteria.lastName = lastName;
    if (email) searchCriteria.email = normalizeEmail(email);
    if (phone) searchCriteria.phone = normalizePhone(phone);
    if (driversLicenseNumber) searchCriteria.driversLicenseNumber = driversLicenseNumber;

    const duplicates = await this.storageService.findDuplicateCustomers(
      searchCriteria,
      dealershipId
    );

    return duplicates.map((c) => this.mapToCustomer(c));
  }

  /**
   * Merge duplicate customers (advanced feature)
   * Keeps one customer, merges data from others, updates all references
   * TODO: Migrate to StorageService - needs complex merge logic
   */
  async mergeDuplicates(
    keepCustomerId: string,
    mergeCustomerIds: string[],
    dealershipId: string
  ): Promise<Customer> {
    // Verify all customers exist and belong to dealership
    const keepCustomer = await this.getCustomer(keepCustomerId, dealershipId);

    for (const mergeId of mergeCustomerIds) {
      await this.getCustomer(mergeId, dealershipId);
    }

    // TODO: Implement merge logic
    // 1. Update all deals to point to keepCustomerId
    // 2. Update all email messages to point to keepCustomerId
    // 3. Merge notes, tags
    // 4. Archive merged customers
    // 5. Return updated customer

    // For now, just return the keep customer
    return keepCustomer;
  }

  // ========================================================================
  // CUSTOMER HISTORY & TIMELINE
  // ========================================================================

  /**
   * Get customer timeline (deals, email messages, interactions)
   * TODO: Consider consolidating with StorageService.getCustomerHistory
   */
  async getCustomerTimeline(
    customerId: string,
    dealershipId: string
  ): Promise<TimelineEvent[]> {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    const events: TimelineEvent[] = [];

    // Get customer deals
    const customerDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.customerId, customerId))
      .orderBy(desc(deals.createdAt));

    for (const deal of customerDeals) {
      events.push({
        id: deal.id,
        type: 'deal',
        date: deal.createdAt.toISOString(),
        title: `Deal ${deal.dealNumber || 'created'}`,
        description: `Status: ${deal.status}`,
        relatedId: deal.id,
        metadata: {
          dealNumber: deal.dealNumber,
          status: deal.status,
        },
      });
    }

    // Get customer email messages
    const customerEmails = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.customerId, customerId))
      .orderBy(desc(emailMessages.createdAt));

    for (const email of customerEmails) {
      events.push({
        id: email.id,
        type: 'email',
        date: email.createdAt.toISOString(),
        title: email.subject || 'Email',
        description: email.status,
        relatedId: email.id,
        metadata: {
          subject: email.subject,
          status: email.status,
        },
      });
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return events;
  }

  /**
   * Get customer deals
   * Delegates to StorageService for tenant-filtered deal retrieval
   */
  async getCustomerDeals(customerId: string, dealershipId: string) {
    return await this.storageService.getCustomerDeals(customerId, dealershipId);
  }

  /**
   * Get customer email messages
   * Delegates to StorageService for tenant-filtered email retrieval
   */
  async getCustomerEmails(customerId: string, dealershipId: string) {
    return await this.storageService.getCustomerEmails(customerId, dealershipId);
  }

  // ========================================================================
  // CUSTOMER NOTES
  // ========================================================================

  /**
   * Get customer notes
   * Returns all notes for a customer with multi-tenant isolation
   */
  async getCustomerNotes(customerId: string, dealershipId: string): Promise<CustomerNote[]> {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    return await this.storageService.getCustomerNotes(customerId, dealershipId);
  }

  /**
   * Create customer note
   * Creates a new note with multi-tenant enforcement
   */
  async createCustomerNote(
    customerId: string,
    dealershipId: string,
    userId: string,
    data: {
      content: string;
      noteType?: string;
      isImportant?: boolean;
      dealId?: string | null;
    }
  ): Promise<CustomerNote> {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    if (!data.content || !data.content.trim()) {
      throw new CustomerValidationError('Note content is required', [
        { field: 'content', message: 'Content cannot be empty' },
      ]);
    }

    return await this.storageService.createCustomerNote({
      customerId,
      userId,
      dealershipId,
      content: data.content.trim(),
      noteType: data.noteType || 'general',
      isImportant: data.isImportant ?? false,
      dealId: data.dealId || null,
    });
  }

  /**
   * Get customer history
   * Returns combined timeline of deals, notes, and customer creation
   * Compatible with old storage.getCustomerHistory format
   */
  async getCustomerHistory(
    customerId: string,
    dealershipId: string
  ): Promise<Array<{
    type: string;
    timestamp: Date;
    data: Record<string, unknown>;
  }>> {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    return await this.storageService.getCustomerHistory(customerId, dealershipId);
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate customer data
   */
  async validateCustomer(
    data: Partial<CreateCustomerRequest>
  ): Promise<ValidationResult> {
    return validateCustomerData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      driversLicenseNumber: data.driversLicense?.number,
      driversLicenseState: data.driversLicense?.state,
      ssnLast4: data.ssnLast4,
    });
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Map database customer to domain Customer type
   */
  private mapToCustomer(dbCustomer: DbCustomer): Customer {
    return {
      id: dbCustomer.id,
      dealershipId: dbCustomer.dealershipId,
      customerNumber: dbCustomer.customerNumber || undefined,
      firstName: dbCustomer.firstName,
      lastName: dbCustomer.lastName,
      middleName: dbCustomer.middleName || undefined,
      suffix: undefined,
      email: dbCustomer.email || undefined,
      phone: dbCustomer.phone || undefined,
      alternatePhone: undefined,
      preferredContactMethod: dbCustomer.preferredContactMethod || 'email',
      address: dbCustomer.address
        ? {
            street: dbCustomer.address,
            city: dbCustomer.city || '',
            state: dbCustomer.state || '',
            zipCode: dbCustomer.zipCode || '',
            county: dbCustomer.county,
            country: 'US',
          }
        : undefined,
      dateOfBirth: dbCustomer.dateOfBirth?.toISOString(),
      driversLicense: dbCustomer.driversLicenseNumber
        ? {
            number: dbCustomer.driversLicenseNumber,
            state: dbCustomer.driversLicenseState || '',
            imageUrl: dbCustomer.licenseImageUrl,
          }
        : undefined,
      ssnLast4: dbCustomer.ssnLast4 || undefined,
      employer: dbCustomer.employer || undefined,
      occupation: dbCustomer.occupation || undefined,
      monthlyIncome: dbCustomer.monthlyIncome
        ? parseFloat(dbCustomer.monthlyIncome)
        : undefined,
      creditScore: dbCustomer.creditScore || undefined,
      creditTier: undefined,
      status: dbCustomer.status,
      source: undefined,
      referredBy: undefined,
      assignedSalespersonId: undefined,
      currentVehicle: dbCustomer.currentVehicleYear
        ? {
            year: dbCustomer.currentVehicleYear,
            make: dbCustomer.currentVehicleMake || '',
            model: dbCustomer.currentVehicleModel || '',
            trim: dbCustomer.currentVehicleTrim,
            vin: dbCustomer.currentVehicleVin,
            mileage: dbCustomer.currentVehicleMileage,
            color: dbCustomer.currentVehicleColor,
          }
        : undefined,
      tradeIn: dbCustomer.tradeAllowance
        ? {
            year: 0,
            make: '',
            model: '',
            allowance: parseFloat(dbCustomer.tradeAllowance),
            actualCashValue: dbCustomer.tradeACV
              ? parseFloat(dbCustomer.tradeACV)
              : undefined,
            payoffAmount: dbCustomer.tradePayoff
              ? parseFloat(dbCustomer.tradePayoff)
              : undefined,
            payoffLender: dbCustomer.tradePayoffTo,
          }
        : undefined,
      marketingOptIn: dbCustomer.marketingOptIn ?? false,
      doNotContact: false,
      photoUrl: dbCustomer.photoUrl || undefined,
      tags: [],
      notes: dbCustomer.notes || undefined,
      internalNotes: undefined,
      lastContactDate: undefined,
      nextFollowUpDate: undefined,
      createdAt: dbCustomer.createdAt.toISOString(),
      updatedAt: dbCustomer.updatedAt.toISOString(),
      deletedAt: undefined,
    };
  }
}

// ========================================================================
// SINGLETON EXPORT
// ========================================================================

let customerServiceInstance: CustomerService | null = null;

export function getCustomerService(): CustomerService {
  if (!customerServiceInstance) {
    customerServiceInstance = new CustomerService();
  }
  return customerServiceInstance;
}

// Convenience export
export const customerService = getCustomerService();
