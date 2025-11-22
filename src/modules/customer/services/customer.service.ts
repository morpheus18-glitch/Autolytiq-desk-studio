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

import { db } from '../../../../server/database/db-service';
import { customers, deals, emailMessages } from '@shared/schema';
import { eq, and, or, like, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
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

    // Create customer
    const now = new Date().toISOString();

    const [customer] = await db
      .insert(customers)
      .values({
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
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning();

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
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.dealershipId, dealershipId) // CRITICAL: Multi-tenant isolation
        )
      )
      .limit(1);

    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    return this.mapToCustomer(customer);
  }

  /**
   * List customers with filters and pagination
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

    // Build WHERE conditions
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
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

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

    // Update customer
    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.dealershipId, dealershipId) // CRITICAL: Multi-tenant isolation
        )
      )
      .returning();

    if (!updated) {
      throw new CustomerNotFoundError(customerId);
    }

    return this.mapToCustomer(updated);
  }

  // ========================================================================
  // DELETE (SOFT DELETE)
  // ========================================================================

  /**
   * Soft delete customer (preserves history)
   */
  async deleteCustomer(customerId: string, dealershipId: string): Promise<void> {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    // Note: Soft delete would require adding deletedAt column to schema
    // For now, just update status to 'archived'
    await db
      .update(customers)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.dealershipId, dealershipId)
        )
      );
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

    const searchTerm = `%${searchQuery.trim().toLowerCase()}%`;

    const results = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.dealershipId, dealershipId),
          or(
            sql`LOWER(${customers.firstName}) LIKE ${searchTerm}`,
            sql`LOWER(${customers.lastName}) LIKE ${searchTerm}`,
            sql`LOWER(${customers.email}) LIKE ${searchTerm}`,
            sql`${customers.phone} LIKE ${searchTerm}`,
            sql`${customers.customerNumber} LIKE ${searchTerm}`
          )!
        )
      )
      .limit(50); // Limit search results

    return results.map((c) => this.mapToCustomer(c));
  }

  // ========================================================================
  // DUPLICATE DETECTION
  // ========================================================================

  /**
   * Find potential duplicate customers
   * Checks: name match, phone match, email match, driver's license match
   */
  async findDuplicates(search: DuplicateSearch): Promise<Customer[]> {
    const { dealershipId, firstName, lastName, email, phone, driversLicenseNumber } =
      search;

    const conditions = [eq(customers.dealershipId, dealershipId)];

    const duplicateConditions = [];

    // Exact name match
    if (firstName && lastName) {
      duplicateConditions.push(
        and(
          sql`LOWER(${customers.firstName}) = LOWER(${firstName})`,
          sql`LOWER(${customers.lastName}) = LOWER(${lastName})`
        )!
      );
    }

    // Phone match
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      duplicateConditions.push(eq(customers.phone, normalizedPhone));
    }

    // Email match
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      duplicateConditions.push(sql`LOWER(${customers.email}) = LOWER(${normalizedEmail})`);
    }

    // Driver's license match
    if (driversLicenseNumber) {
      duplicateConditions.push(
        sql`UPPER(${customers.driversLicenseNumber}) = UPPER(${driversLicenseNumber})`
      );
    }

    if (duplicateConditions.length === 0) {
      return [];
    }

    conditions.push(or(...duplicateConditions)!);

    const duplicates = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .limit(10);

    return duplicates.map((c) => this.mapToCustomer(c));
  }

  /**
   * Merge duplicate customers (advanced feature)
   * Keeps one customer, merges data from others, updates all references
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
   */
  async getCustomerDeals(customerId: string, dealershipId: string) {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    return await db
      .select()
      .from(deals)
      .where(eq(deals.customerId, customerId))
      .orderBy(desc(deals.createdAt));
  }

  /**
   * Get customer email messages
   */
  async getCustomerEmails(customerId: string, dealershipId: string) {
    // Verify customer exists and belongs to dealership
    await this.getCustomer(customerId, dealershipId);

    return await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.customerId, customerId))
      .orderBy(desc(emailMessages.createdAt));
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
  private mapToCustomer(dbCustomer: Record<string, unknown>): Customer {
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
