/**
 * VEHICLE API ROUTES
 * RESTful API endpoints for vehicle management with strict multi-tenant isolation
 */

import { Router, Request, Response, NextFunction } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { InventoryService } from '../services/inventory.service';
import { VINDecoderService } from '../services/vin-decoder.service';
import { StockNumberService } from '../services/stock-number.service';
import {
  CreateVehicleRequestSchema,
  UpdateVehicleRequestSchema,
  InventoryFiltersSchema,
  BulkImportRequestSchema,
  VehicleError,
  VehicleNotFoundError,
  InvalidVINError,
  DuplicateVINError,
  DuplicateStockNumberError,
  VehicleNotAvailableError,
} from '../types/vehicle.types';

/**
 * Create vehicle router
 * All routes are protected and require dealershipId for multi-tenant isolation
 */
export function createVehicleRouter(): Router {
  const router = Router();
  const vehicleService = new VehicleService();
  const inventoryService = new InventoryService();
  const vinDecoder = new VINDecoderService();
  const stockNumberService = new StockNumberService();

  /**
   * GET /api/vehicles
   * Get paginated inventory with filters
   * Query params: dealershipId (required), status, type, make, model, year, etc.
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate filters
      const filters = InventoryFiltersSchema.parse({
        dealershipId: req.query.dealershipId,
        status: req.query.status,
        statuses: req.query.statuses ? JSON.parse(req.query.statuses as string) : undefined,
        type: req.query.type,
        types: req.query.types ? JSON.parse(req.query.types as string) : undefined,
        make: req.query.make,
        model: req.query.model,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        yearMin: req.query.yearMin ? parseInt(req.query.yearMin as string) : undefined,
        yearMax: req.query.yearMax ? parseInt(req.query.yearMax as string) : undefined,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        mileageMin: req.query.mileageMin ? parseInt(req.query.mileageMin as string) : undefined,
        mileageMax: req.query.mileageMax ? parseInt(req.query.mileageMax as string) : undefined,
        bodyStyle: req.query.bodyStyle,
        transmission: req.query.transmission,
        drivetrain: req.query.drivetrain,
        fuelType: req.query.fuelType,
        location: req.query.location,
        search: req.query.search,
        tags: req.query.tags ? JSON.parse(req.query.tags as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
        includeDeleted: req.query.includeDeleted === 'true',
      });

      const result = await vehicleService.getInventory(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vehicles/:id
   * Get single vehicle by ID
   * Query params: dealershipId (required)
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const vehicle = await vehicleService.getVehicle(id, dealershipId);
      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles
   * Create new vehicle
   * Body: CreateVehicleRequest
   * Query params: dealershipId (required)
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dealershipId = req.query.dealershipId as string;
      const userId = req.user?.id; // From auth middleware

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      // Validate request body
      const data = CreateVehicleRequestSchema.parse(req.body);

      // Create vehicle
      const vehicle = await vehicleService.createVehicle(dealershipId, data, userId);

      res.status(201).json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /api/vehicles/:id
   * Update vehicle
   * Body: UpdateVehicleRequest
   * Query params: dealershipId (required)
   */
  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;
      const userId = req.user?.id;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      // Validate request body
      const data = UpdateVehicleRequestSchema.parse(req.body);

      // Update vehicle
      const vehicle = await vehicleService.updateVehicle(id, dealershipId, data, userId);

      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/vehicles/:id
   * Delete vehicle (soft delete)
   * Query params: dealershipId (required)
   */
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;
      const userId = req.user?.id;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      await vehicleService.deleteVehicle(id, dealershipId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vehicles/vin/:vin
   * Get vehicle by VIN
   * Query params: dealershipId (required)
   */
  router.get('/vin/:vin', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vin } = req.params;
      const dealershipId = req.query.dealershipId as string;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const vehicle = await vehicleService.getVehicleByVIN(vin, dealershipId);

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vehicles/stock/:stockNumber
   * Get vehicle by stock number
   * Query params: dealershipId (required)
   */
  router.get('/stock/:stockNumber', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stockNumber } = req.params;
      const dealershipId = req.query.dealershipId as string;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const vehicle = await vehicleService.getVehicleByStockNumber(stockNumber, dealershipId);

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles/:id/reserve
   * Reserve vehicle for deal
   * Body: { dealId: string, reservedUntil: string }
   * Query params: dealershipId (required)
   */
  router.post('/:id/reserve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;
      const userId = req.user?.id;
      const { dealId, reservedUntil } = req.body;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      if (!dealId || !reservedUntil) {
        return res.status(400).json({ error: 'dealId and reservedUntil are required' });
      }

      const vehicle = await inventoryService.reserveVehicle(
        id,
        dealershipId,
        dealId,
        new Date(reservedUntil),
        userId
      );

      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles/:id/release
   * Release vehicle reservation
   * Query params: dealershipId (required)
   */
  router.post('/:id/release', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;
      const userId = req.user?.id;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const vehicle = await inventoryService.releaseVehicle(id, dealershipId, userId);

      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /api/vehicles/:id/status
   * Update vehicle status
   * Body: { status: VehicleStatusType, notes?: string }
   * Query params: dealershipId (required)
   */
  router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;
      const userId = req.user?.id;
      const { status, notes } = req.body;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const vehicle = await inventoryService.updateVehicleStatus(
        id,
        dealershipId,
        status,
        userId,
        notes
      );

      res.json(vehicle);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vehicles/:id/history
   * Get vehicle history
   * Query params: dealershipId (required)
   */
  router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const history = await inventoryService.getVehicleHistory(id, dealershipId);

      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vehicles/summary
   * Get inventory summary/statistics
   * Query params: dealershipId (required)
   */
  router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dealershipId = req.query.dealershipId as string;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const summary = await inventoryService.getInventorySummary(dealershipId);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vehicles/:id/metrics
   * Get vehicle value metrics
   * Query params: dealershipId (required)
   */
  router.get('/:id/metrics', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dealershipId = req.query.dealershipId as string;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const metrics = await inventoryService.getVehicleValueMetrics(id, dealershipId);

      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles/decode-vin
   * Decode VIN
   * Body: { vin: string }
   */
  router.post('/decode-vin', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vin } = req.body;

      if (!vin) {
        return res.status(400).json({ error: 'vin is required' });
      }

      const result = await vinDecoder.decodeVIN(vin);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles/validate-vin
   * Validate VIN
   * Body: { vin: string }
   */
  router.post('/validate-vin', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vin } = req.body;

      if (!vin) {
        return res.status(400).json({ error: 'vin is required' });
      }

      const result = vinDecoder.validateVIN(vin);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles/generate-stock-number
   * Generate stock number
   * Query params: dealershipId (required)
   * Body: { prefix?: string }
   */
  router.post('/generate-stock-number', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dealershipId = req.query.dealershipId as string;
      const { prefix } = req.body;

      if (!dealershipId) {
        return res.status(400).json({ error: 'dealershipId is required' });
      }

      const stockNumber = await stockNumberService.generateStockNumber(dealershipId, prefix);

      res.json({ stockNumber });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/vehicles/import
   * Bulk import vehicles
   * Body: BulkImportRequest
   */
  router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = BulkImportRequestSchema.parse(req.body);

      const result = await vehicleService.importVehicles(request);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Error handler middleware
   */
  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[VehicleRouter] Error:', error);

    if (error instanceof VehicleNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }

    if (error instanceof InvalidVINError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }

    if (error instanceof DuplicateVINError || error instanceof DuplicateStockNumberError) {
      return res.status(409).json({ error: error.message, code: error.code });
    }

    if (error instanceof VehicleNotAvailableError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }

    if (error instanceof VehicleError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }

    // Zod validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    });
  });

  return router;
}
