/**
 * STOCK NUMBER SERVICE
 * Atomic stock number generation with database sequences
 */

import { db } from '../../../../server/database/db-service';
import { sql } from 'drizzle-orm';
import { StorageService } from '../../../core/database/storage.service';
import { DuplicateStockNumberError } from '../types/vehicle.types';

/**
 * Stock Number Generation Service
 * Provides atomic, unique stock number generation per dealership
 */
export class StockNumberService {
  private storageService: StorageService;

  constructor(storageService?: StorageService) {
    this.storageService = storageService || new StorageService();
  }

  /**
   * Generate unique stock number for dealership
   * Uses database sequence to ensure atomicity across concurrent requests
   *
   * Format: {prefix}{year}-{sequence}
   * Example: "25-00001", "USED-25-00042", "NEW-25-12345"
   *
   * @param dealershipId - Dealership UUID
   * @param prefix - Optional prefix (e.g., "NEW", "USED", "CERT")
   * @returns Generated stock number
   */
  async generateStockNumber(dealershipId: string, prefix?: string): Promise<string> {
    try {
      // Use StorageService's atomic stock number generation
      // Note: StorageService doesn't support custom prefix yet, falls back to legacy if prefix provided
      if (prefix) {
        // TODO: Migrate to StorageService.generateStockNumber with prefix support
        console.warn('[StockNumberService] Custom prefix not yet supported in StorageService, using legacy implementation');

        // Use serializable transaction for maximum safety
        const stockNumber = await db.transaction(
          async (tx) => {
            // Upsert sequence record and increment atomically
            // This ensures no two vehicles get the same number even under high concurrency
            const result = await tx.execute(sql`
              INSERT INTO stock_number_sequences (dealership_id, last_number, updated_at)
              VALUES (${dealershipId}, 1, NOW())
              ON CONFLICT (dealership_id)
              DO UPDATE SET
                last_number = stock_number_sequences.last_number + 1,
                updated_at = NOW()
              RETURNING last_number
            `);

            const sequence = Number(result.rows[0].last_number);
            const year = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year

            // Format: PREFIX-YY-NNNNN or YY-NNNNN
            const sequenceStr = sequence.toString().padStart(5, '0');
            return `${prefix.toUpperCase()}-${year}-${sequenceStr}`;
          },
          { isolationLevel: 'serializable' }
        );

        return stockNumber;
      }

      // Use StorageService for standard stock number generation
      return await this.storageService.generateStockNumber(dealershipId);
    } catch (error) {
      console.error('[StockNumberService] Failed to generate stock number:', error);
      throw new Error(`Failed to generate stock number: ${error.message}`);
    }
  }

  /**
   * Generate custom stock number with validation
   * Allows manual stock number creation but validates uniqueness
   *
   * @param dealershipId - Dealership UUID
   * @param stockNumber - Custom stock number
   * @returns Validated stock number
   * @throws DuplicateStockNumberError if stock number already exists
   */
  async createCustomStockNumber(
    dealershipId: string,
    stockNumber: string
  ): Promise<string> {
    // Normalize stock number
    const normalized = stockNumber.trim().toUpperCase();

    // Validate format (alphanumeric, hyphens allowed)
    if (!/^[A-Z0-9-]+$/.test(normalized)) {
      throw new Error('Stock number must be alphanumeric with optional hyphens');
    }

    // Check for duplicates
    const exists = await this.checkStockNumberExists(dealershipId, normalized);
    if (exists) {
      throw new DuplicateStockNumberError(normalized);
    }

    return normalized;
  }

  /**
   * Check if stock number already exists for dealership
   *
   * @param dealershipId - Dealership UUID
   * @param stockNumber - Stock number to check
   * @returns True if stock number exists
   */
  async checkStockNumberExists(dealershipId: string, stockNumber: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE dealership_id = ${dealershipId}
          AND stock_number = ${stockNumber.toUpperCase()}
          AND deleted_at IS NULL
      `);

      const count = Number(result.rows[0].count);
      return count > 0;
    } catch (error) {
      console.error('[StockNumberService] Failed to check stock number:', error);
      throw new Error(`Failed to check stock number: ${error.message}`);
    }
  }

  /**
   * Validate stock number format
   *
   * @param stockNumber - Stock number to validate
   * @returns True if format is valid
   */
  validateStockNumberFormat(stockNumber: string): boolean {
    if (!stockNumber || stockNumber.length === 0) {
      return false;
    }

    // Must be alphanumeric with optional hyphens
    if (!/^[A-Z0-9-]+$/i.test(stockNumber)) {
      return false;
    }

    // Reasonable length (3-20 characters)
    if (stockNumber.length < 3 || stockNumber.length > 20) {
      return false;
    }

    return true;
  }

  /**
   * Get current sequence number for dealership
   * Useful for reporting/analytics
   *
   * @param dealershipId - Dealership UUID
   * @returns Current sequence number
   */
  async getCurrentSequence(dealershipId: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT last_number
        FROM stock_number_sequences
        WHERE dealership_id = ${dealershipId}
      `);

      if (result.rows.length === 0) {
        return 0;
      }

      return Number(result.rows[0].last_number);
    } catch (error) {
      console.error('[StockNumberService] Failed to get current sequence:', error);
      throw new Error(`Failed to get current sequence: ${error.message}`);
    }
  }

  /**
   * Reset sequence for dealership
   * WARNING: Use with extreme caution - this can cause duplicate stock numbers
   * Should only be used during migration or data cleanup
   *
   * @param dealershipId - Dealership UUID
   * @param newSequence - New sequence number (default: 0)
   */
  async resetSequence(dealershipId: string, newSequence: number = 0): Promise<void> {
    console.warn(
      `[StockNumberService] RESETTING SEQUENCE for dealership ${dealershipId} to ${newSequence}`
    );

    try {
      await db.execute(sql`
        INSERT INTO stock_number_sequences (dealership_id, last_number, updated_at)
        VALUES (${dealershipId}, ${newSequence}, NOW())
        ON CONFLICT (dealership_id)
        DO UPDATE SET
          last_number = ${newSequence},
          updated_at = NOW()
      `);
    } catch (error) {
      console.error('[StockNumberService] Failed to reset sequence:', error);
      throw new Error(`Failed to reset sequence: ${error.message}`);
    }
  }

  /**
   * Sync sequence with existing vehicles
   * Sets sequence to max stock number + 1
   * Useful for initial setup or after bulk imports
   *
   * @param dealershipId - Dealership UUID
   * @returns New sequence number
   */
  async syncSequenceWithVehicles(dealershipId: string): Promise<number> {
    try {
      // Find highest stock number that matches our format (YY-NNNNN)
      const result = await db.execute(sql`
        SELECT stock_number
        FROM vehicles
        WHERE dealership_id = ${dealershipId}
          AND deleted_at IS NULL
          AND stock_number ~ '^[0-9]{2}-[0-9]{5}$'
        ORDER BY stock_number DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // No vehicles found, start from 0
        await this.resetSequence(dealershipId, 0);
        return 0;
      }

      const stockNumber = result.rows[0].stock_number as string;
      const sequence = parseInt(stockNumber.split('-')[1], 10);

      // Set sequence to this number
      await this.resetSequence(dealershipId, sequence);

      console.log(
        `[StockNumberService] Synced sequence for dealership ${dealershipId} to ${sequence}`
      );

      return sequence;
    } catch (error) {
      console.error('[StockNumberService] Failed to sync sequence:', error);
      throw new Error(`Failed to sync sequence: ${error.message}`);
    }
  }

  /**
   * Get stock number statistics for dealership
   *
   * @param dealershipId - Dealership UUID
   * @returns Stock number stats
   */
  async getStockNumberStats(
    dealershipId: string
  ): Promise<{
    currentSequence: number;
    totalVehicles: number;
    customStockNumbers: number;
    autoGeneratedStockNumbers: number;
  }> {
    try {
      const [sequenceResult, statsResult] = await Promise.all([
        db.execute(sql`
          SELECT last_number
          FROM stock_number_sequences
          WHERE dealership_id = ${dealershipId}
        `),
        db.execute(sql`
          SELECT
            COUNT(*) as total_vehicles,
            COUNT(CASE WHEN stock_number ~ '^[0-9]{2}-[0-9]{5}$' THEN 1 END) as auto_generated,
            COUNT(CASE WHEN stock_number !~ '^[0-9]{2}-[0-9]{5}$' THEN 1 END) as custom
          FROM vehicles
          WHERE dealership_id = ${dealershipId}
            AND deleted_at IS NULL
        `),
      ]);

      const currentSequence =
        sequenceResult.rows.length > 0 ? Number(sequenceResult.rows[0].last_number) : 0;

      const stats = statsResult.rows[0];

      return {
        currentSequence,
        totalVehicles: Number(stats.total_vehicles),
        autoGeneratedStockNumbers: Number(stats.auto_generated),
        customStockNumbers: Number(stats.custom),
      };
    } catch (error) {
      console.error('[StockNumberService] Failed to get stats:', error);
      throw new Error(`Failed to get stock number stats: ${error.message}`);
    }
  }

  /**
   * Parse stock number to extract prefix and sequence
   * Works with formats like "NEW-25-00001", "25-00001", etc.
   *
   * @param stockNumber - Stock number to parse
   * @returns Parsed components or null if not in expected format
   */
  parseStockNumber(stockNumber: string): {
    prefix?: string;
    year?: string;
    sequence?: number;
    raw: string;
  } | null {
    const normalized = stockNumber.trim().toUpperCase();

    // Try to match PREFIX-YY-NNNNN format
    const prefixMatch = normalized.match(/^([A-Z]+)-(\d{2})-(\d+)$/);
    if (prefixMatch) {
      return {
        prefix: prefixMatch[1],
        year: prefixMatch[2],
        sequence: parseInt(prefixMatch[3], 10),
        raw: normalized,
      };
    }

    // Try to match YY-NNNNN format
    const simpleMatch = normalized.match(/^(\d{2})-(\d+)$/);
    if (simpleMatch) {
      return {
        year: simpleMatch[1],
        sequence: parseInt(simpleMatch[2], 10),
        raw: normalized,
      };
    }

    // Unknown format
    return null;
  }
}
