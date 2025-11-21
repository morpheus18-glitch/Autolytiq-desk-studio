/**
 * INVENTORY SERVICE
 * Vehicle inventory management, status tracking, and history
 */

import { db } from '@server/database/db-service';
import { sql, and, eq, isNull, desc, asc, inArray } from 'drizzle-orm';
import {
  VehicleStatus,
  VehicleNotFoundError,
  VehicleNotAvailableError,
  type Vehicle,
  type VehicleStatusType,
  type InventoryFilters,
  type PaginatedVehicles,
  type VehicleHistoryEvent,
  type VehicleSummary,
  type VehicleValueMetrics,
} from '../types/vehicle.types';

/**
 * Inventory Service
 * Handles vehicle inventory tracking, status management, and reporting
 */
export class InventoryService {
  /**
   * Get paginated vehicle inventory with filters
   */
  async getInventory(filters: InventoryFilters): Promise<PaginatedVehicles> {
    try {
      const { dealershipId, page, limit, sortBy, sortOrder } = filters;
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions = [
        sql`v.dealership_id = ${dealershipId}`,
        filters.includeDeleted ? sql`1=1` : sql`v.deleted_at IS NULL`,
      ];

      // Status filters
      if (filters.status) {
        conditions.push(sql`v.status = ${filters.status}`);
      } else if (filters.statuses && filters.statuses.length > 0) {
        conditions.push(sql`v.status = ANY(${filters.statuses})`);
      }

      // Type filters
      if (filters.type) {
        conditions.push(sql`v.type = ${filters.type}`);
      } else if (filters.types && filters.types.length > 0) {
        conditions.push(sql`v.type = ANY(${filters.types})`);
      }

      // Make/Model/Year filters
      if (filters.make) {
        conditions.push(sql`LOWER(v.make) = LOWER(${filters.make})`);
      }
      if (filters.model) {
        conditions.push(sql`LOWER(v.model) = LOWER(${filters.model})`);
      }
      if (filters.year) {
        conditions.push(sql`v.year = ${filters.year}`);
      }
      if (filters.yearMin) {
        conditions.push(sql`v.year >= ${filters.yearMin}`);
      }
      if (filters.yearMax) {
        conditions.push(sql`v.year <= ${filters.yearMax}`);
      }

      // Price filters
      if (filters.priceMin) {
        conditions.push(sql`v.asking_price >= ${filters.priceMin}`);
      }
      if (filters.priceMax) {
        conditions.push(sql`v.asking_price <= ${filters.priceMax}`);
      }

      // Mileage filters
      if (filters.mileageMin) {
        conditions.push(sql`v.mileage >= ${filters.mileageMin}`);
      }
      if (filters.mileageMax) {
        conditions.push(sql`v.mileage <= ${filters.mileageMax}`);
      }

      // Other filters
      if (filters.bodyStyle) {
        conditions.push(sql`v.body_style = ${filters.bodyStyle}`);
      }
      if (filters.transmission) {
        conditions.push(sql`v.transmission = ${filters.transmission}`);
      }
      if (filters.drivetrain) {
        conditions.push(sql`v.drivetrain = ${filters.drivetrain}`);
      }
      if (filters.fuelType) {
        conditions.push(sql`v.fuel_type = ${filters.fuelType}`);
      }
      if (filters.location) {
        conditions.push(sql`v.location = ${filters.location}`);
      }

      // Text search (VIN, stock number, make, model, features)
      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(v.vin) LIKE ${searchTerm} OR
            LOWER(v.stock_number) LIKE ${searchTerm} OR
            LOWER(v.make) LIKE ${searchTerm} OR
            LOWER(v.model) LIKE ${searchTerm} OR
            LOWER(v.trim) LIKE ${searchTerm}
          )`
        );
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        conditions.push(sql`v.tags && ${filters.tags}`);
      }

      // Date range filters
      if (filters.acquiredFrom) {
        conditions.push(sql`v.acquired_date >= ${filters.acquiredFrom}`);
      }
      if (filters.acquiredTo) {
        conditions.push(sql`v.acquired_date <= ${filters.acquiredTo}`);
      }

      // Build WHERE clause
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      // Build ORDER BY clause
      const orderByMap: Record<string, any> = {
        createdAt: sql`v.created_at`,
        updatedAt: sql`v.updated_at`,
        year: sql`v.year`,
        make: sql`v.make`,
        model: sql`v.model`,
        mileage: sql`v.mileage`,
        askingPrice: sql`v.asking_price`,
        stockNumber: sql`v.stock_number`,
        acquiredDate: sql`v.acquired_date`,
      };

      const orderByColumn = orderByMap[sortBy] || sql`v.created_at`;
      const orderDirection = sortOrder === 'asc' ? sql`ASC` : sql`DESC`;

      // Execute count query
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM vehicles v
        ${whereClause}
      `);

      const total = Number(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Execute data query
      const dataResult = await db.execute(sql`
        SELECT
          v.id,
          v.dealership_id,
          v.vin,
          v.stock_number,
          v.year,
          v.make,
          v.model,
          v.trim,
          v.type,
          v.body_style,
          v.exterior_color,
          v.interior_color,
          v.transmission,
          v.drivetrain,
          v.fuel_type,
          v.engine,
          v.cylinders,
          v.displacement,
          v.mileage,
          v.condition,
          v.cost,
          v.msrp,
          v.asking_price,
          v.internet_price,
          v.status,
          v.location,
          v.reserved_until,
          v.reserved_for_deal_id,
          v.features,
          v.photos,
          v.description,
          v.notes,
          v.internal_notes,
          v.tags,
          v.acquired_date,
          v.acquired_from,
          v.floor_plan_provider,
          v.floor_plan_date,
          v.sold_date,
          v.sold_price,
          v.sold_to_deal_id,
          v.created_at,
          v.updated_at,
          v.deleted_at
        FROM vehicles v
        ${whereClause}
        ORDER BY ${orderByColumn} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      const vehicles = dataResult.rows.map(this.mapRowToVehicle);

      return {
        vehicles,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      console.error('[InventoryService] Failed to get inventory:', error);
      throw new Error(`Failed to get inventory: ${error.message}`);
    }
  }

  /**
   * Update vehicle status with history tracking
   */
  async updateVehicleStatus(
    vehicleId: string,
    dealershipId: string,
    newStatus: VehicleStatusType,
    userId?: string,
    notes?: string
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
        const oldStatus = current.status;

        // Update status
        const updateResult = await tx.execute(sql`
          UPDATE vehicles
          SET
            status = ${newStatus},
            updated_at = NOW()
          WHERE id = ${vehicleId}
          RETURNING *
        `);

        const updated = this.mapRowToVehicle(updateResult.rows[0]);

        // Log history event
        await tx.execute(sql`
          INSERT INTO vehicle_history (
            id,
            vehicle_id,
            event_type,
            timestamp,
            user_id,
            old_value,
            new_value,
            notes
          ) VALUES (
            gen_random_uuid(),
            ${vehicleId},
            'status_change',
            NOW(),
            ${userId || null},
            ${oldStatus},
            ${newStatus},
            ${notes || null}
          )
        `);

        return updated;
      });
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        throw error;
      }
      console.error('[InventoryService] Failed to update vehicle status:', error);
      throw new Error(`Failed to update vehicle status: ${error.message}`);
    }
  }

  /**
   * Reserve vehicle for a deal
   */
  async reserveVehicle(
    vehicleId: string,
    dealershipId: string,
    dealId: string,
    reservedUntil: Date,
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

        // Check if vehicle is available
        if (current.status !== VehicleStatus.AVAILABLE) {
          throw new VehicleNotAvailableError(vehicleId, current.status);
        }

        // Reserve vehicle
        const updateResult = await tx.execute(sql`
          UPDATE vehicles
          SET
            status = ${VehicleStatus.RESERVED},
            reserved_until = ${reservedUntil.toISOString()},
            reserved_for_deal_id = ${dealId},
            updated_at = NOW()
          WHERE id = ${vehicleId}
          RETURNING *
        `);

        const updated = this.mapRowToVehicle(updateResult.rows[0]);

        // Log history
        await tx.execute(sql`
          INSERT INTO vehicle_history (
            id,
            vehicle_id,
            event_type,
            timestamp,
            user_id,
            new_value,
            metadata
          ) VALUES (
            gen_random_uuid(),
            ${vehicleId},
            'reserved',
            NOW(),
            ${userId || null},
            ${VehicleStatus.RESERVED},
            ${JSON.stringify({ dealId, reservedUntil: reservedUntil.toISOString() })}
          )
        `);

        return updated;
      });
    } catch (error) {
      if (error instanceof VehicleNotFoundError || error instanceof VehicleNotAvailableError) {
        throw error;
      }
      console.error('[InventoryService] Failed to reserve vehicle:', error);
      throw new Error(`Failed to reserve vehicle: ${error.message}`);
    }
  }

  /**
   * Release vehicle reservation
   */
  async releaseVehicle(vehicleId: string, dealershipId: string, userId?: string): Promise<Vehicle> {
    try {
      return await db.transaction(async (tx) => {
        // Release reservation
        const updateResult = await tx.execute(sql`
          UPDATE vehicles
          SET
            status = ${VehicleStatus.AVAILABLE},
            reserved_until = NULL,
            reserved_for_deal_id = NULL,
            updated_at = NOW()
          WHERE id = ${vehicleId}
            AND dealership_id = ${dealershipId}
            AND deleted_at IS NULL
          RETURNING *
        `);

        if (updateResult.rows.length === 0) {
          throw new VehicleNotFoundError(vehicleId);
        }

        const updated = this.mapRowToVehicle(updateResult.rows[0]);

        // Log history
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
            ${vehicleId},
            'unreserved',
            NOW(),
            ${userId || null},
            ${VehicleStatus.AVAILABLE}
          )
        `);

        return updated;
      });
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        throw error;
      }
      console.error('[InventoryService] Failed to release vehicle:', error);
      throw new Error(`Failed to release vehicle: ${error.message}`);
    }
  }

  /**
   * Get vehicle history
   */
  async getVehicleHistory(vehicleId: string, dealershipId: string): Promise<VehicleHistoryEvent[]> {
    try {
      // Verify vehicle belongs to dealership
      const vehicleResult = await db.execute(sql`
        SELECT id FROM vehicles
        WHERE id = ${vehicleId}
          AND dealership_id = ${dealershipId}
      `);

      if (vehicleResult.rows.length === 0) {
        throw new VehicleNotFoundError(vehicleId);
      }

      // Get history events
      const historyResult = await db.execute(sql`
        SELECT
          id,
          vehicle_id,
          event_type,
          timestamp,
          user_id,
          old_value,
          new_value,
          notes,
          metadata
        FROM vehicle_history
        WHERE vehicle_id = ${vehicleId}
        ORDER BY timestamp DESC
      `);

      return historyResult.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        vehicleId: row.vehicle_id,
        eventType: row.event_type,
        timestamp: row.timestamp,
        userId: row.user_id || undefined,
        oldValue: row.old_value || undefined,
        newValue: row.new_value || undefined,
        notes: row.notes || undefined,
        metadata: row.metadata || undefined,
      }));
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        throw error;
      }
      console.error('[InventoryService] Failed to get vehicle history:', error);
      throw new Error(`Failed to get vehicle history: ${error.message}`);
    }
  }

  /**
   * Get inventory summary/statistics
   */
  async getInventorySummary(dealershipId: string): Promise<VehicleSummary> {
    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_vehicles,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_vehicles,
          SUM(asking_price) as total_inventory_value,
          AVG(asking_price) as average_price,
          AVG(mileage) as average_mileage,

          -- By status
          COUNT(CASE WHEN status = 'available' THEN 1 END) as status_available,
          COUNT(CASE WHEN status = 'reserved' THEN 1 END) as status_reserved,
          COUNT(CASE WHEN status = 'in-deal' THEN 1 END) as status_in_deal,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as status_sold,
          COUNT(CASE WHEN status = 'service' THEN 1 END) as status_service,
          COUNT(CASE WHEN status = 'wholesale' THEN 1 END) as status_wholesale,
          COUNT(CASE WHEN status = 'unavailable' THEN 1 END) as status_unavailable,

          -- By type
          COUNT(CASE WHEN type = 'new' THEN 1 END) as type_new,
          COUNT(CASE WHEN type = 'used' THEN 1 END) as type_used,
          COUNT(CASE WHEN type = 'certified' THEN 1 END) as type_certified
        FROM vehicles
        WHERE dealership_id = ${dealershipId}
          AND deleted_at IS NULL
      `);

      const row = result.rows[0];

      // Get make breakdown
      const makeResult = await db.execute(sql`
        SELECT make, COUNT(*) as count
        FROM vehicles
        WHERE dealership_id = ${dealershipId}
          AND deleted_at IS NULL
        GROUP BY make
        ORDER BY count DESC
      `);

      const byMake: Record<string, number> = {};
      makeResult.rows.forEach((r: Record<string, unknown>) => {
        byMake[r.make] = Number(r.count);
      });

      return {
        totalVehicles: Number(row.total_vehicles),
        availableVehicles: Number(row.available_vehicles),
        soldVehicles: Number(row.sold_vehicles),
        totalInventoryValue: Number(row.total_inventory_value) || 0,
        averagePrice: Number(row.average_price) || 0,
        averageMileage: Number(row.average_mileage) || 0,
        byStatus: {
          available: Number(row.status_available),
          reserved: Number(row.status_reserved),
          'in-deal': Number(row.status_in_deal),
          sold: Number(row.status_sold),
          service: Number(row.status_service),
          wholesale: Number(row.status_wholesale),
          unavailable: Number(row.status_unavailable),
        },
        byType: {
          new: Number(row.type_new),
          used: Number(row.type_used),
          certified: Number(row.type_certified),
        },
        byMake,
      };
    } catch (error) {
      console.error('[InventoryService] Failed to get inventory summary:', error);
      throw new Error(`Failed to get inventory summary: ${error.message}`);
    }
  }

  /**
   * Get vehicle value metrics
   */
  async getVehicleValueMetrics(vehicleId: string, dealershipId: string): Promise<VehicleValueMetrics> {
    try {
      const result = await db.execute(sql`
        SELECT
          cost,
          msrp,
          asking_price,
          created_at
        FROM vehicles
        WHERE id = ${vehicleId}
          AND dealership_id = ${dealershipId}
          AND deleted_at IS NULL
      `);

      if (result.rows.length === 0) {
        throw new VehicleNotFoundError(vehicleId);
      }

      const row = result.rows[0];
      const cost = Number(row.cost);
      const msrp = Number(row.msrp) || 0;
      const askingPrice = Number(row.asking_price);
      const createdAt = new Date(row.created_at);
      const now = new Date();
      const daysInInventory = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Count price reductions from history
      const historyResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM vehicle_history
        WHERE vehicle_id = ${vehicleId}
          AND event_type = 'price_change'
          AND CAST(new_value AS DECIMAL) < CAST(old_value AS DECIMAL)
      `);

      const priceReductions = Number(historyResult.rows[0].count);

      return {
        cost,
        msrp,
        askingPrice,
        potentialProfit: askingPrice - cost,
        daysInInventory,
        priceReductions,
      };
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        throw error;
      }
      console.error('[InventoryService] Failed to get vehicle value metrics:', error);
      throw new Error(`Failed to get vehicle value metrics: ${error.message}`);
    }
  }

  /**
   * Map database row to Vehicle type
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
}
