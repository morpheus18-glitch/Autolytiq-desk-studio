/**
 * VEHICLE SERVICE
 * Core vehicle CRUD operations with multi-tenant isolation
 */

import { db } from '../../../core/database/index';
import { sql, and, eq, isNull } from 'drizzle-orm';
import { StorageService } from '../../../core/database/storage.service';
import { VINDecoderService } from './vin-decoder.service';
import { StockNumberService } from './stock-number.service';
import { InventoryService } from './inventory.service';
import {
  VehicleNotFoundError,
  DuplicateVINError,
  DuplicateStockNumberError,
  InvalidVINError,
  VehicleAccessDeniedError,
  type Vehicle,
  type CreateVehicleRequest,
  type UpdateVehicleRequest,
  type InventoryFilters,
  type PaginatedVehicles,
  type VINDecodeResult,
  type BulkImportRequest,
  type BulkImportResult,
  VehicleStatus,
} from '../types/vehicle.types';

/**
 * Vehicle Service
 * Provides complete vehicle management functionality
 */
export class VehicleService {
  private storageService: StorageService;
  private vinDecoder: VINDecoderService;
  private stockNumberService: StockNumberService;
  private inventoryService: InventoryService;

  constructor(storageService?: StorageService) {
    this.storageService = storageService || new StorageService();
    this.vinDecoder = new VINDecoderService();
    this.stockNumberService = new StockNumberService();
    this.inventoryService = new InventoryService();
  }

  /**
   * Create new vehicle
   */
  async createVehicle(
    dealershipId: string,
    data: CreateVehicleRequest,
    userId?: string
  ): Promise<Vehicle> {
    try {
      return await db.transaction(async (tx) => {
        // Validate VIN
        const vinValidation = this.vinDecoder.validateVIN(data.vin);
        if (!vinValidation.valid) {
          throw new InvalidVINError(vinValidation.error || 'Invalid VIN');
        }

        // Check for duplicate VIN
        const vinExists = await this.checkVINExists(dealershipId, data.vin);
        if (vinExists) {
          throw new DuplicateVINError(data.vin);
        }

        // Generate or validate stock number
        let stockNumber: string;
        if (data.stockNumber) {
          // Custom stock number provided
          stockNumber = await this.stockNumberService.createCustomStockNumber(
            dealershipId,
            data.stockNumber
          );
        } else {
          // Auto-generate stock number
          stockNumber = await this.stockNumberService.generateStockNumber(dealershipId);
        }

        // Insert vehicle
        const result = await tx.execute(sql`
          INSERT INTO vehicles (
            id,
            dealership_id,
            vin,
            stock_number,
            year,
            make,
            model,
            trim,
            type,
            body_style,
            exterior_color,
            interior_color,
            transmission,
            drivetrain,
            fuel_type,
            engine,
            cylinders,
            displacement,
            mileage,
            condition,
            cost,
            msrp,
            asking_price,
            internet_price,
            status,
            location,
            features,
            photos,
            description,
            notes,
            internal_notes,
            tags,
            acquired_date,
            acquired_from,
            floor_plan_provider,
            floor_plan_date,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${dealershipId},
            ${data.vin.toUpperCase()},
            ${stockNumber},
            ${data.year},
            ${data.make},
            ${data.model},
            ${data.trim || null},
            ${data.type},
            ${data.bodyStyle},
            ${data.exteriorColor},
            ${data.interiorColor},
            ${data.transmission},
            ${data.drivetrain},
            ${data.fuelType},
            ${data.engine || null},
            ${data.cylinders || null},
            ${data.displacement || null},
            ${data.mileage},
            ${data.condition || null},
            ${data.cost},
            ${data.msrp || null},
            ${data.askingPrice},
            ${data.internetPrice || null},
            ${data.status},
            ${data.location},
            ${JSON.stringify(data.features || [])},
            ${JSON.stringify(data.photos || [])},
            ${data.description || null},
            ${data.notes || null},
            ${data.internalNotes || null},
            ${JSON.stringify(data.tags || [])},
            ${data.acquiredDate || null},
            ${data.acquiredFrom || null},
            ${data.floorPlanProvider || null},
            ${data.floorPlanDate || null},
            NOW(),
            NOW()
          )
          RETURNING *
        `);

        const vehicle = this.mapRowToVehicle(result.rows[0]);

        // Log creation in history
        await tx.execute(sql`
          INSERT INTO vehicle_history (
            id,
            vehicle_id,
            event_type,
            timestamp,
            user_id,
            new_value
          ) VALUES (
            gen_random_uuid(),
            ${vehicle.id},
            'created',
            NOW(),
            ${userId || null},
            ${JSON.stringify({ stockNumber, vin: data.vin })}
          )
        `);

        return vehicle;
      });
    } catch (error) {
      if (
        error instanceof InvalidVINError ||
        error instanceof DuplicateVINError ||
        error instanceof DuplicateStockNumberError
      ) {
        throw error;
      }
      console.error('[VehicleService] Failed to create vehicle:', error);
      throw new Error(`Failed to create vehicle: ${error.message}`);
    }
  }

  /**
   * Get vehicle by ID
   */
  async getVehicle(vehicleId: string, dealershipId: string): Promise<Vehicle> {
    try {
      const vehicle = await this.storageService.getVehicle(vehicleId, dealershipId);

      if (!vehicle) {
        throw new VehicleNotFoundError(vehicleId);
      }

      return this.mapDrizzleToVehicle(vehicle);
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        throw error;
      }
      console.error('[VehicleService] Failed to get vehicle:', error);
      throw new Error(`Failed to get vehicle: ${error.message}`);
    }
  }

  /**
   * Get vehicle by VIN
   * Delegates to StorageService for tenant-filtered VIN lookup
   */
  async getVehicleByVIN(vin: string, dealershipId: string): Promise<Vehicle | null> {
    try {
      const vehicle = await this.storageService.getVehicleByVIN(vin, dealershipId);

      if (!vehicle) {
        return null;
      }

      return this.mapDrizzleToVehicle(vehicle);
    } catch (error) {
      console.error('[VehicleService] Failed to get vehicle by VIN:', error);
      throw new Error(`Failed to get vehicle by VIN: ${error.message}`);
    }
  }

  /**
   * Get vehicle by stock number
   */
  async getVehicleByStockNumber(stockNumber: string, dealershipId: string): Promise<Vehicle | null> {
    try {
      const vehicle = await this.storageService.getVehicleByStock(stockNumber, dealershipId);

      if (!vehicle) {
        return null;
      }

      return this.mapDrizzleToVehicle(vehicle);
    } catch (error) {
      console.error('[VehicleService] Failed to get vehicle by stock number:', error);
      throw new Error(`Failed to get vehicle by stock number: ${error.message}`);
    }
  }

  /**
   * Update vehicle
   */
  async updateVehicle(
    vehicleId: string,
    dealershipId: string,
    data: UpdateVehicleRequest,
    userId?: string
  ): Promise<Vehicle> {
    try {
      return await db.transaction(async (tx) => {
        // Get current vehicle
        const currentResult = await tx.execute(sql`
          SELECT * FROM vehicles
          WHERE id = ${vehicleId}
            AND dealership_id = ${dealershipId}
            AND deleted_at IS NULL
          FOR UPDATE
        `);

        if (currentResult.rows.length === 0) {
          throw new VehicleNotFoundError(vehicleId);
        }

        const current = this.mapRowToVehicle(currentResult.rows[0]);

        // If VIN is being changed, validate and check for duplicates
        if (data.vin && data.vin !== current.vin) {
          const vinValidation = this.vinDecoder.validateVIN(data.vin);
          if (!vinValidation.valid) {
            throw new InvalidVINError(vinValidation.error || 'Invalid VIN');
          }

          const vinExists = await this.checkVINExists(dealershipId, data.vin);
          if (vinExists) {
            throw new DuplicateVINError(data.vin);
          }
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: unknown[] = [];

        if (data.vin !== undefined) {
          updates.push(`vin = $${values.length + 1}`);
          values.push(data.vin.toUpperCase());
        }
        if (data.year !== undefined) {
          updates.push(`year = $${values.length + 1}`);
          values.push(data.year);
        }
        if (data.make !== undefined) {
          updates.push(`make = $${values.length + 1}`);
          values.push(data.make);
        }
        if (data.model !== undefined) {
          updates.push(`model = $${values.length + 1}`);
          values.push(data.model);
        }
        if (data.trim !== undefined) {
          updates.push(`trim = $${values.length + 1}`);
          values.push(data.trim);
        }
        if (data.type !== undefined) {
          updates.push(`type = $${values.length + 1}`);
          values.push(data.type);
        }
        if (data.bodyStyle !== undefined) {
          updates.push(`body_style = $${values.length + 1}`);
          values.push(data.bodyStyle);
        }
        if (data.exteriorColor !== undefined) {
          updates.push(`exterior_color = $${values.length + 1}`);
          values.push(data.exteriorColor);
        }
        if (data.interiorColor !== undefined) {
          updates.push(`interior_color = $${values.length + 1}`);
          values.push(data.interiorColor);
        }
        if (data.transmission !== undefined) {
          updates.push(`transmission = $${values.length + 1}`);
          values.push(data.transmission);
        }
        if (data.drivetrain !== undefined) {
          updates.push(`drivetrain = $${values.length + 1}`);
          values.push(data.drivetrain);
        }
        if (data.fuelType !== undefined) {
          updates.push(`fuel_type = $${values.length + 1}`);
          values.push(data.fuelType);
        }
        if (data.engine !== undefined) {
          updates.push(`engine = $${values.length + 1}`);
          values.push(data.engine);
        }
        if (data.cylinders !== undefined) {
          updates.push(`cylinders = $${values.length + 1}`);
          values.push(data.cylinders);
        }
        if (data.displacement !== undefined) {
          updates.push(`displacement = $${values.length + 1}`);
          values.push(data.displacement);
        }
        if (data.mileage !== undefined) {
          updates.push(`mileage = $${values.length + 1}`);
          values.push(data.mileage);
        }
        if (data.condition !== undefined) {
          updates.push(`condition = $${values.length + 1}`);
          values.push(data.condition);
        }
        if (data.cost !== undefined) {
          updates.push(`cost = $${values.length + 1}`);
          values.push(data.cost);
        }
        if (data.msrp !== undefined) {
          updates.push(`msrp = $${values.length + 1}`);
          values.push(data.msrp);
        }
        if (data.askingPrice !== undefined) {
          updates.push(`asking_price = $${values.length + 1}`);
          values.push(data.askingPrice);

          // Track price changes
          if (data.askingPrice !== current.askingPrice) {
            await tx.execute(sql`
              INSERT INTO vehicle_history (
                id,
                vehicle_id,
                event_type,
                timestamp,
                user_id,
                old_value,
                new_value
              ) VALUES (
                gen_random_uuid(),
                ${vehicleId},
                'price_change',
                NOW(),
                ${userId || null},
                ${current.askingPrice.toString()},
                ${data.askingPrice.toString()}
              )
            `);
          }
        }
        if (data.internetPrice !== undefined) {
          updates.push(`internet_price = $${values.length + 1}`);
          values.push(data.internetPrice);
        }
        if (data.status !== undefined) {
          updates.push(`status = $${values.length + 1}`);
          values.push(data.status);
        }
        if (data.location !== undefined) {
          updates.push(`location = $${values.length + 1}`);
          values.push(data.location);

          // Track location changes
          if (data.location !== current.location) {
            await tx.execute(sql`
              INSERT INTO vehicle_history (
                id,
                vehicle_id,
                event_type,
                timestamp,
                user_id,
                old_value,
                new_value
              ) VALUES (
                gen_random_uuid(),
                ${vehicleId},
                'location_change',
                NOW(),
                ${userId || null},
                ${current.location},
                ${data.location}
              )
            `);
          }
        }
        if (data.features !== undefined) {
          updates.push(`features = $${values.length + 1}`);
          values.push(JSON.stringify(data.features));
        }
        if (data.photos !== undefined) {
          updates.push(`photos = $${values.length + 1}`);
          values.push(JSON.stringify(data.photos));
        }
        if (data.description !== undefined) {
          updates.push(`description = $${values.length + 1}`);
          values.push(data.description);
        }
        if (data.notes !== undefined) {
          updates.push(`notes = $${values.length + 1}`);
          values.push(data.notes);
        }
        if (data.internalNotes !== undefined) {
          updates.push(`internal_notes = $${values.length + 1}`);
          values.push(data.internalNotes);
        }
        if (data.tags !== undefined) {
          updates.push(`tags = $${values.length + 1}`);
          values.push(JSON.stringify(data.tags));
        }

        // Always update updated_at
        updates.push(`updated_at = NOW()`);

        if (updates.length === 1) {
          // Only updated_at, nothing to update
          return current;
        }

        // Build and execute update query
        const updateQuery = `
          UPDATE vehicles
          SET ${updates.join(', ')}
          WHERE id = $${values.length + 1}
          RETURNING *
        `;
        values.push(vehicleId);

        const updateResult = await tx.execute(sql.raw(updateQuery, values));
        const updated = this.mapRowToVehicle(updateResult.rows[0]);

        // Log update in history
        await tx.execute(sql`
          INSERT INTO vehicle_history (
            id,
            vehicle_id,
            event_type,
            timestamp,
            user_id
          ) VALUES (
            gen_random_uuid(),
            ${vehicleId},
            'updated',
            NOW(),
            ${userId || null}
          )
        `);

        return updated;
      });
    } catch (error) {
      if (
        error instanceof VehicleNotFoundError ||
        error instanceof InvalidVINError ||
        error instanceof DuplicateVINError
      ) {
        throw error;
      }
      console.error('[VehicleService] Failed to update vehicle:', error);
      throw new Error(`Failed to update vehicle: ${error.message}`);
    }
  }

  /**
   * Delete vehicle (soft delete)
   */
  async deleteVehicle(vehicleId: string, dealershipId: string, userId?: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Verify vehicle exists and belongs to dealership
        const checkResult = await tx.execute(sql`
          SELECT id FROM vehicles
          WHERE id = ${vehicleId}
            AND dealership_id = ${dealershipId}
            AND deleted_at IS NULL
        `);

        if (checkResult.rows.length === 0) {
          throw new VehicleNotFoundError(vehicleId);
        }

        // Soft delete
        await tx.execute(sql`
          UPDATE vehicles
          SET
            deleted_at = NOW(),
            updated_at = NOW()
          WHERE id = ${vehicleId}
        `);

        // Log deletion
        await tx.execute(sql`
          INSERT INTO vehicle_history (
            id,
            vehicle_id,
            event_type,
            timestamp,
            user_id
          ) VALUES (
            gen_random_uuid(),
            ${vehicleId},
            'deleted',
            NOW(),
            ${userId || null}
          )
        `);
      });
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        throw error;
      }
      console.error('[VehicleService] Failed to delete vehicle:', error);
      throw new Error(`Failed to delete vehicle: ${error.message}`);
    }
  }

  /**
   * Get inventory with filters (delegates to InventoryService)
   */
  async getInventory(filters: InventoryFilters): Promise<PaginatedVehicles> {
    return this.inventoryService.getInventory(filters);
  }

  /**
   * Decode VIN
   */
  async decodeVIN(vin: string): Promise<VINDecodeResult> {
    return this.vinDecoder.decodeVIN(vin);
  }

  /**
   * Validate VIN
   */
  validateVIN(vin: string) {
    return this.vinDecoder.validateVIN(vin);
  }

  /**
   * Generate stock number
   */
  async generateStockNumber(dealershipId: string, prefix?: string): Promise<string> {
    return this.stockNumberService.generateStockNumber(dealershipId, prefix);
  }

  /**
   * Check if VIN exists for dealership
   * Delegates to StorageService for tenant-filtered VIN check
   */
  async checkVINExists(dealershipId: string, vin: string): Promise<boolean> {
    try {
      return await this.storageService.checkVINExists(vin, dealershipId);
    } catch (error) {
      console.error('[VehicleService] Failed to check VIN existence:', error);
      throw new Error(`Failed to check VIN existence: ${error.message}`);
    }
  }

  /**
   * Bulk import vehicles
   */
  async importVehicles(request: BulkImportRequest): Promise<BulkImportResult> {
    const { dealershipId, vehicles, skipDuplicates, updateExisting } = request;
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      total: vehicles.length,
      errors: [],
      imported: [],
    };

    for (let i = 0; i < vehicles.length; i++) {
      const vehicleData = vehicles[i];

      try {
        // Check if VIN already exists
        const existing = await this.getVehicleByVIN(vehicleData.vin, dealershipId);

        if (existing) {
          if (updateExisting) {
            // Update existing vehicle
            await this.updateVehicle(existing.id, dealershipId, vehicleData);
            result.success++;
            result.imported.push(existing.id);
          } else if (skipDuplicates) {
            // Skip duplicate
            result.skipped++;
          } else {
            // Error on duplicate
            result.failed++;
            result.errors.push({
              index: i,
              vin: vehicleData.vin,
              error: `Vehicle with VIN ${vehicleData.vin} already exists`,
            });
          }
        } else {
          // Create new vehicle
          const created = await this.createVehicle(dealershipId, vehicleData as CreateVehicleRequest);
          result.success++;
          result.imported.push(created.id);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          vin: vehicleData.vin,
          error: error.message || 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Map database row to Vehicle type (legacy - for direct DB calls)
   */
  private mapRowToVehicle(row: Record<string, unknown>): Vehicle {
    return {
      id: row.id,
      dealershipId: row.dealership_id,
      vin: row.vin,
      stockNumber: row.stock_number,
      year: Number(row.year),
      make: row.make,
      model: row.model,
      trim: row.trim || undefined,
      type: row.type,
      bodyStyle: row.body_style,
      exteriorColor: row.exterior_color,
      interiorColor: row.interior_color,
      transmission: row.transmission,
      drivetrain: row.drivetrain,
      fuelType: row.fuel_type,
      engine: row.engine || undefined,
      cylinders: row.cylinders ? Number(row.cylinders) : undefined,
      displacement: row.displacement || undefined,
      mileage: Number(row.mileage),
      condition: row.condition || undefined,
      cost: Number(row.cost),
      msrp: row.msrp ? Number(row.msrp) : undefined,
      askingPrice: Number(row.asking_price),
      internetPrice: row.internet_price ? Number(row.internet_price) : undefined,
      status: row.status,
      location: row.location,
      reservedUntil: row.reserved_until || undefined,
      reservedForDealId: row.reserved_for_deal_id || undefined,
      features: row.features || [],
      photos: row.photos || [],
      description: row.description || undefined,
      notes: row.notes || undefined,
      internalNotes: row.internal_notes || undefined,
      tags: row.tags || [],
      acquiredDate: row.acquired_date || undefined,
      acquiredFrom: row.acquired_from || undefined,
      floorPlanProvider: row.floor_plan_provider || undefined,
      floorPlanDate: row.floor_plan_date || undefined,
      soldDate: row.sold_date || undefined,
      soldPrice: row.sold_price ? Number(row.sold_price) : undefined,
      soldToDealId: row.sold_to_deal_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || undefined,
    };
  }

  /**
   * Map Drizzle vehicle type to Vehicle type (for StorageService results)
   */
  private mapDrizzleToVehicle(drizzleVehicle: Record<string, unknown>): Vehicle {
    return {
      id: drizzleVehicle.id,
      dealershipId: drizzleVehicle.dealershipId,
      vin: drizzleVehicle.vin,
      stockNumber: drizzleVehicle.stockNumber,
      year: Number(drizzleVehicle.year),
      make: drizzleVehicle.make,
      model: drizzleVehicle.model,
      trim: drizzleVehicle.trim || undefined,
      type: drizzleVehicle.type,
      bodyStyle: drizzleVehicle.bodyStyle,
      exteriorColor: drizzleVehicle.exteriorColor,
      interiorColor: drizzleVehicle.interiorColor,
      transmission: drizzleVehicle.transmission,
      drivetrain: drizzleVehicle.drivetrain,
      fuelType: drizzleVehicle.fuelType,
      engine: drizzleVehicle.engine || undefined,
      cylinders: drizzleVehicle.cylinders ? Number(drizzleVehicle.cylinders) : undefined,
      displacement: drizzleVehicle.displacement || undefined,
      mileage: Number(drizzleVehicle.mileage),
      condition: drizzleVehicle.condition || undefined,
      cost: Number(drizzleVehicle.cost || drizzleVehicle.price || 0),
      msrp: drizzleVehicle.msrp ? Number(drizzleVehicle.msrp) : undefined,
      askingPrice: Number(drizzleVehicle.askingPrice || drizzleVehicle.price || 0),
      internetPrice: drizzleVehicle.internetPrice ? Number(drizzleVehicle.internetPrice) : undefined,
      status: drizzleVehicle.status,
      location: drizzleVehicle.location,
      reservedUntil: drizzleVehicle.reservedUntil || undefined,
      reservedForDealId: drizzleVehicle.reservedForDealId || undefined,
      features: drizzleVehicle.features || [],
      photos: drizzleVehicle.photos || [],
      description: drizzleVehicle.description || undefined,
      notes: drizzleVehicle.notes || undefined,
      internalNotes: drizzleVehicle.internalNotes || undefined,
      tags: drizzleVehicle.tags || [],
      acquiredDate: drizzleVehicle.acquiredDate || undefined,
      acquiredFrom: drizzleVehicle.acquiredFrom || undefined,
      floorPlanProvider: drizzleVehicle.floorPlanProvider || undefined,
      floorPlanDate: drizzleVehicle.floorPlanDate || undefined,
      soldDate: drizzleVehicle.soldDate || undefined,
      soldPrice: drizzleVehicle.soldPrice ? Number(drizzleVehicle.soldPrice) : undefined,
      soldToDealId: drizzleVehicle.soldToDealId || undefined,
      createdAt: drizzleVehicle.createdAt,
      updatedAt: drizzleVehicle.updatedAt,
      deletedAt: drizzleVehicle.deletedAt || undefined,
    };
  }
}
