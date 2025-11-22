/**
 * STORAGE ADAPTER - BACKWARD COMPATIBILITY & MODULE BRIDGING
 *
 * This adapter serves two purposes:
 * 1. Maintains backward compatibility during migration from /server/storage.ts
 * 2. Bridges new module architecture with the secure StorageService
 *
 * MIGRATION STRATEGY:
 * Phase 1: Routes use adapter (current)
 * Phase 2: Routes updated to pass tenantId
 * Phase 3: Adapter removed, routes use StorageService directly
 *
 * DO NOT ADD NEW METHODS HERE - This adapter is temporary
 */

import { StorageService } from '../database/storage.service';
import type { IStorage } from '../database/storage.interface';
import type { AuthStorage } from '@/modules/auth';
import type { DealStorage } from '@/modules/deal';
import type { TaxStorage } from '@/modules/tax';
import type { InsertUser, User, DealershipSettings, InsertDeal, Deal, InsertTradeVehicle, TradeVehicle, InsertTaxJurisdiction, TaxJurisdiction } from '@shared/schema';

/**
 * Create storage adapter with backward compatibility
 * @param defaultTenantId Optional default tenant ID for development (NOT for production)
 */
export function createStorageAdapter(defaultTenantId?: string): IStorage {
  const service = new StorageService();

  console.warn(
    '[StorageAdapter] MIGRATION IN PROGRESS: Using compatibility adapter. Routes should be updated to pass tenantId.'
  );

  // Return service directly - routes MUST pass tenantId to all methods
  // This forces proper tenant isolation at the route level
  return service;
}

/**
 * Get storage service instance
 * This is the recommended way to access storage going forward
 */
export function getStorageService(): StorageService {
  return new StorageService();
}

/**
 * Singleton storage service for shared use
 */
let storageServiceInstance: StorageService | null = null;

export function getSharedStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

/**
 * Create auth storage adapter
 * Wraps StorageService to match AuthStorage interface
 */
export function createAuthStorageAdapter(storage: IStorage): AuthStorage {
  return {
    async getUserByUsername(username: string) {
      return await storage.getUserByUsername(username);
    },

    async getUserByEmail(email: string) {
      return await storage.getUserByEmail(email);
    },

    async getUser(id: string) {
      // Auth module needs to look up users without tenant filter for login
      return await storage.getUser(id);
    },

    async getUserByResetToken(hashedToken: string) {
      return await storage.getUserByResetToken(hashedToken);
    },

    async createUser(data: InsertUser, dealershipId: string) {
      return await storage.createUser(data, dealershipId);
    },

    async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>) {
      // Note: This needs tenant validation - auth module should pass tenantId
      console.warn('[AuthStorageAdapter] updateUser called without tenantId - update auth module');
      throw new Error('updateUser requires tenantId parameter - auth module needs update');
    },

    async getDealershipSettings(): Promise<DealershipSettings | undefined> {
      // Note: This needs tenantId parameter
      console.warn('[AuthStorageAdapter] getDealershipSettings called without tenantId');
      throw new Error('getDealershipSettings requires tenantId parameter');
    },
  };
}

/**
 * Create deal storage adapter
 * Wraps StorageService to match DealStorage interface
 */
export function createDealStorageAdapter(storage: IStorage): DealStorage {
  return {
    async createDeal(data: InsertDeal): Promise<Deal> {
      // Note: This needs tenantId parameter
      throw new Error('createDeal requires tenantId parameter - deal module needs update');
    },

    async updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal> {
      // Note: This needs tenantId parameter
      throw new Error('updateDeal requires tenantId parameter - deal module needs update');
    },

    async getDeal(id: string): Promise<Deal | undefined> {
      // Note: This needs tenantId parameter
      throw new Error('getDeal requires tenantId parameter - deal module needs update');
    },

    async listDeals(query: { page?: number; pageSize?: number; search?: string; status?: string; dealershipId: string }) {
      // The query should include dealershipId
      if (!query.dealershipId) {
        throw new Error('listDeals requires dealershipId in query');
      }
      return await storage.getDeals({
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        search: query.search,
        status: query.status,
        dealershipId: query.dealershipId,
      });
    },

    async deleteDeal(id: string): Promise<void> {
      // Note: Deals are not deleted, they are marked as cancelled
      throw new Error('deleteDeal not supported - use updateDealState instead');
    },

    async getNextDealNumber(dealershipId: string): Promise<string> {
      return await storage.generateDealNumber(dealershipId);
    },
  };
}

/**
 * Create tax storage adapter
 * Wraps StorageService to match TaxStorage interface
 */
export function createTaxStorageAdapter(storage: IStorage): TaxStorage {
  return {
    async getTaxJurisdiction(zipCode: string) {
      // First lookup zip code
      const zipData = await storage.getZipCodeLookup(zipCode);
      if (!zipData) {
        return undefined;
      }

      // Then get tax jurisdiction
      return await storage.getTaxJurisdiction(zipData.state, zipData.county, zipData.city);
    },

    async saveTaxJurisdiction(data: InsertTaxJurisdiction): Promise<TaxJurisdiction> {
      return await storage.createTaxJurisdiction(data);
    },

    async listTaxJurisdictions(state?: string) {
      if (state) {
        // Filter by state
        const all = await storage.getAllTaxJurisdictions();
        return all.filter((j) => j.state === state);
      }
      return await storage.getAllTaxJurisdictions();
    },
  };
}
