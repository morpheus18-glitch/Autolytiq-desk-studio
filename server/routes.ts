import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import rateLimit from "express-rate-limit";
import { insertCustomerSchema, insertVehicleSchema, insertDealSchema, insertDealScenarioSchema, insertTradeVehicleSchema, insertTaxJurisdictionSchema } from "@shared/schema";
import { calculateFinancePayment, calculateLeasePayment, calculateSalesTax } from "./calculations";
import { z } from "zod";

// Rate limiting middleware - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use('/api', limiter);
  
  // ===== USERS =====
  app.get('/api/users', async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get users' });
    }
  });
  
  // ===== CUSTOMERS =====
  app.get('/api/customers/search', async (req, res) => {
    try {
      const query = String(req.query.q || '');
      const customers = await storage.searchCustomers(query);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search customers' });
    }
  });
  
  app.get('/api/customers/:id', async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get customer' });
    }
  });
  
  app.post('/api/customers', async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create customer' });
    }
  });
  
  app.patch('/api/customers/:id', async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update customer' });
    }
  });
  
  // ===== VEHICLES =====
  app.get('/api/vehicles/search', async (req, res) => {
    try {
      const query = String(req.query.q || '');
      const vehicles = await storage.searchVehicles(query);
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search vehicles' });
    }
  });
  
  app.get('/api/vehicles/stock/:stockNumber', async (req, res) => {
    try {
      const vehicle = await storage.getVehicleByStock(req.params.stockNumber);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get vehicle' });
    }
  });
  
  app.get('/api/vehicles/:id', async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get vehicle' });
    }
  });
  
  app.post('/api/vehicles', async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.status(201).json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create vehicle' });
    }
  });
  
  // ===== INVENTORY MANAGEMENT =====
  // GET /api/inventory - list vehicles with pagination and filters
  app.get('/api/inventory', async (req, res) => {
    try {
      const querySchema = z.object({
        page: z.coerce.number().min(1).optional(),
        pageSize: z.coerce.number().min(1).max(100).optional(),
        status: z.string().optional(),
        condition: z.enum(['new', 'used', 'certified']).optional(),
        make: z.string().optional(),
        model: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        minYear: z.coerce.number().min(1900).max(2050).optional(),
        maxYear: z.coerce.number().min(1900).max(2050).optional(),
      });
      
      const options = querySchema.parse(req.query);
      const result = await storage.getInventory(options);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to get inventory' });
    }
  });
  
  // GET /api/inventory/search - search with advanced filters
  app.get('/api/inventory/search', async (req, res) => {
    try {
      const searchSchema = z.object({
        query: z.string().optional(),
        make: z.string().optional(),
        model: z.string().optional(),
        yearMin: z.coerce.number().min(1900).optional(),
        yearMax: z.coerce.number().max(2050).optional(),
        priceMin: z.coerce.number().min(0).optional(),
        priceMax: z.coerce.number().optional(),
        mileageMax: z.coerce.number().min(0).optional(),
        condition: z.enum(['new', 'used', 'certified']).optional(),
        status: z.enum(['available', 'hold', 'sold', 'in_transit']).optional(),
        fuelType: z.string().optional(),
        drivetrain: z.enum(['FWD', 'RWD', 'AWD', '4WD']).optional(),
        transmission: z.enum(['Automatic', 'Manual', 'CVT']).optional(),
      });
      
      const filters = searchSchema.parse(req.query);
      const vehicles = await storage.searchInventory(filters);
      res.json(vehicles);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to search inventory' });
    }
  });
  
  // GET /api/inventory/:stockNumber - get specific vehicle by stock number
  app.get('/api/inventory/:stockNumber', async (req, res) => {
    try {
      const vehicle = await storage.getVehicleByStockNumber(req.params.stockNumber);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get vehicle' });
    }
  });
  
  // POST /api/inventory - add new vehicle
  app.post('/api/inventory', async (req, res) => {
    try {
      // Custom validation for inventory creation
      const inventoryCreateSchema = insertVehicleSchema.extend({
        images: z.array(z.string().url()).optional(),
        features: z.array(z.object({
          category: z.string(),
          name: z.string(),
          description: z.string().optional(),
        })).optional(),
      });
      
      const data = inventoryCreateSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.status(201).json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create vehicle' });
    }
  });
  
  // PATCH /api/inventory/:stockNumber - update vehicle
  app.patch('/api/inventory/:stockNumber', async (req, res) => {
    try {
      const stockNumber = req.params.stockNumber;
      
      // First get the vehicle to find its ID
      const existingVehicle = await storage.getVehicleByStockNumber(stockNumber);
      if (!existingVehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      // Update vehicle by ID
      const updateSchema = insertVehicleSchema.partial().extend({
        images: z.array(z.string().url()).optional(),
        features: z.array(z.object({
          category: z.string(),
          name: z.string(),
          description: z.string().optional(),
        })).optional(),
        status: z.enum(['available', 'hold', 'sold', 'in_transit']).optional(),
      });
      
      const updateData = updateSchema.parse(req.body);
      const updatedVehicle = await storage.updateVehicle(existingVehicle.id, updateData);
      res.json(updatedVehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update vehicle' });
    }
  });
  
  // ===== TRADE VEHICLES =====
  app.get('/api/deals/:dealId/trades', async (req, res) => {
    try {
      const { dealId } = req.params;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const trades = await storage.getTradeVehiclesByDeal(dealId);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get trade vehicles' });
    }
  });

  app.post('/api/deals/:dealId/trades', async (req, res) => {
    try {
      const { dealId } = req.params;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const tradeVehicleInputSchema = insertTradeVehicleSchema
        .omit({ dealId: true })
        .merge(z.object({
          year: z.coerce.number(),
          mileage: z.coerce.number(),
          allowance: z.coerce.number(),
          payoff: z.coerce.number().default(0),
        }));
      
      const input = tradeVehicleInputSchema.parse(req.body);
      
      const data = {
        ...input,
        dealId,
        allowance: String(input.allowance),
        payoff: String(input.payoff),
      };
      
      const tradeVehicle = await storage.createTradeVehicle(data);
      
      await storage.createAuditLog({
        dealId,
        userId: deal.salespersonId,
        action: 'create',
        entityType: 'trade_vehicle',
        entityId: tradeVehicle.id,
        fieldName: 'trade_vehicle',
        oldValue: '',
        newValue: `${tradeVehicle.year} ${tradeVehicle.make} ${tradeVehicle.model}`,
      });
      
      res.status(201).json(tradeVehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create trade vehicle' });
    }
  });

  app.patch('/api/deals/:dealId/trades/:tradeId', async (req, res) => {
    try {
      const { dealId, tradeId } = req.params;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const oldTrade = await storage.getTradeVehicle(tradeId);
      if (!oldTrade) {
        return res.status(404).json({ error: 'Trade vehicle not found' });
      }
      
      if (oldTrade.dealId !== dealId) {
        return res.status(403).json({ error: 'Trade vehicle does not belong to this deal' });
      }
      
      const tradeVehicleUpdateSchema = insertTradeVehicleSchema
        .omit({ dealId: true })
        .merge(z.object({
          year: z.coerce.number(),
          mileage: z.coerce.number(),
          allowance: z.coerce.number(),
          payoff: z.coerce.number(),
        }))
        .partial();
      
      const input = tradeVehicleUpdateSchema.parse(req.body);
      
      const data: any = { ...input };
      if (input.allowance !== undefined) data.allowance = String(input.allowance);
      if (input.payoff !== undefined) data.payoff = String(input.payoff);
      
      const tradeVehicle = await storage.updateTradeVehicle(tradeId, data);
      
      const significantFields = ['allowance', 'payoff', 'year', 'make', 'model', 'mileage'];
      for (const field of significantFields) {
        if (req.body[field] !== undefined && String((oldTrade as any)[field]) !== String((tradeVehicle as any)[field])) {
          await storage.createAuditLog({
            dealId,
            userId: deal.salespersonId,
            action: 'update',
            entityType: 'trade_vehicle',
            entityId: tradeVehicle.id,
            fieldName: field,
            oldValue: String((oldTrade as any)[field] || ''),
            newValue: String((tradeVehicle as any)[field] || ''),
          });
        }
      }
      
      res.json(tradeVehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update trade vehicle' });
    }
  });

  app.delete('/api/deals/:dealId/trades/:tradeId', async (req, res) => {
    try {
      const { dealId, tradeId } = req.params;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const tradeVehicle = await storage.getTradeVehicle(tradeId);
      if (!tradeVehicle) {
        return res.status(404).json({ error: 'Trade vehicle not found' });
      }
      
      if (tradeVehicle.dealId !== dealId) {
        return res.status(403).json({ error: 'Trade vehicle does not belong to this deal' });
      }
      
      await storage.deleteTradeVehicle(tradeId);
      
      await storage.createAuditLog({
        dealId,
        userId: deal.salespersonId,
        action: 'delete',
        entityType: 'trade_vehicle',
        entityId: tradeId,
        fieldName: 'trade_vehicle',
        oldValue: `${tradeVehicle.year} ${tradeVehicle.make} ${tradeVehicle.model}`,
        newValue: '',
      });
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete trade vehicle' });
    }
  });
  
  // ===== TAX JURISDICTIONS =====
  app.get('/api/tax-jurisdictions', async (req, res) => {
    try {
      const { state, county, city } = req.query;
      
      // If no query params, return all jurisdictions
      if (!state && !county && !city) {
        const jurisdictions = await storage.getAllTaxJurisdictions();
        return res.json(jurisdictions);
      }
      
      // Otherwise, search for specific jurisdiction
      const jurisdiction = await storage.getTaxJurisdiction(
        String(state || ''),
        county ? String(county) : undefined,
        city ? String(city) : undefined
      );
      if (!jurisdiction) {
        return res.status(404).json({ error: 'Tax jurisdiction not found' });
      }
      res.json(jurisdiction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tax jurisdiction' });
    }
  });
  
  app.post('/api/tax-jurisdictions', async (req, res) => {
    try {
      const data = insertTaxJurisdictionSchema.parse(req.body);
      const jurisdiction = await storage.createTaxJurisdiction(data);
      res.status(201).json(jurisdiction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create tax jurisdiction' });
    }
  });
  
  // ===== DEALS =====
  app.get('/api/deals', async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '20'));
      const search = req.query.search ? String(req.query.search) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      
      const result = await storage.getDeals({ page, pageSize, search, status });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get deals' });
    }
  });
  
  app.get('/api/deals/:id', async (req, res) => {
    try {
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      res.json(deal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get deal' });
    }
  });
  
  app.post('/api/deals', async (req, res) => {
    try {
      const data = insertDealSchema.parse(req.body);
      const deal = await storage.createDeal(data);
      
      // Create audit log
      await storage.createAuditLog({
        dealId: deal.id,
        userId: data.salespersonId,
        action: 'create',
        entityType: 'deal',
        entityId: deal.id,
        metadata: { dealNumber: deal.dealNumber },
      });
      
      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create deal' });
    }
  });
  
  app.patch('/api/deals/:id', async (req, res) => {
    try {
      const oldDeal = await storage.getDeal(req.params.id);
      if (!oldDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const deal = await storage.updateDeal(req.params.id, req.body);
      
      // Create audit log for each changed field
      const changes = Object.keys(req.body);
      for (const field of changes) {
        await storage.createAuditLog({
          dealId: deal.id,
          userId: oldDeal.salespersonId, // Default to salesperson
          action: 'update',
          entityType: 'deal',
          entityId: deal.id,
          fieldName: field,
          oldValue: String((oldDeal as any)[field] || ''),
          newValue: String((deal as any)[field] || ''),
        });
      }
      
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update deal' });
    }
  });
  
  app.patch('/api/deals/:id/state', async (req, res) => {
    try {
      const { state } = req.body;
      const oldDeal = await storage.getDeal(req.params.id);
      if (!oldDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const deal = await storage.updateDealState(req.params.id, state);
      
      // Create audit log
      await storage.createAuditLog({
        dealId: deal.id,
        userId: oldDeal.salespersonId,
        action: 'state_change',
        entityType: 'deal',
        entityId: deal.id,
        fieldName: 'dealState',
        oldValue: oldDeal.dealState,
        newValue: deal.dealState,
      });
      
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update deal state' });
    }
  });
  
  // ===== DEAL SCENARIOS =====
  app.post('/api/deals/:dealId/scenarios', async (req, res) => {
    try {
      const dealId = req.params.dealId;
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const data = insertDealScenarioSchema.parse({ ...req.body, dealId });
      const scenario = await storage.createScenario(data);
      
      // Create audit log
      await storage.createAuditLog({
        dealId,
        scenarioId: scenario.id,
        userId: deal.salespersonId,
        action: 'create',
        entityType: 'scenario',
        entityId: scenario.id,
        metadata: { scenarioType: scenario.scenarioType, name: scenario.name },
      });
      
      res.status(201).json(scenario);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create scenario' });
    }
  });
  
  app.patch('/api/deals/:dealId/scenarios/:scenarioId', async (req, res) => {
    try {
      const { dealId, scenarioId } = req.params;
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const oldScenario = await storage.getScenario(scenarioId);
      if (!oldScenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }
      
      const scenario = await storage.updateScenario(scenarioId, req.body);
      
      // Create audit log for significant changes
      const significantFields = ['vehicleId', 'tradeVehicleId', 'vehiclePrice', 'apr', 'term', 'moneyFactor', 'residualValue', 'downPayment', 'tradeAllowance', 'tradePayoff'];
      for (const field of significantFields) {
        if (req.body[field] !== undefined && String((oldScenario as any)[field]) !== String((scenario as any)[field])) {
          await storage.createAuditLog({
            dealId,
            scenarioId: scenario.id,
            userId: deal.salespersonId,
            action: 'update',
            entityType: 'scenario',
            entityId: scenario.id,
            fieldName: field,
            oldValue: String((oldScenario as any)[field] || ''),
            newValue: String((scenario as any)[field] || ''),
          });
        }
      }
      
      res.json(scenario);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update scenario' });
    }
  });
  
  app.delete('/api/deals/:dealId/scenarios/:scenarioId', async (req, res) => {
    try {
      const { dealId, scenarioId } = req.params;
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      await storage.deleteScenario(scenarioId);
      
      // Create audit log
      await storage.createAuditLog({
        dealId,
        scenarioId,
        userId: deal.salespersonId,
        action: 'delete',
        entityType: 'scenario',
        entityId: scenarioId,
      });
      
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to delete scenario' });
    }
  });
  
  // ===== AUDIT LOGS =====
  app.get('/api/deals/:id/audit', async (req, res) => {
    try {
      const logs = await storage.getDealAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  });
  
  // ===== TAX CALCULATIONS =====
  app.get('/api/tax/states', async (req, res) => {
    try {
      const { STATE_TAX_DATA } = await import('../shared/tax-data');
      const states = Object.values(STATE_TAX_DATA).sort((a, b) => 
        a.stateName.localeCompare(b.stateName)
      );
      res.json(states);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get state tax data' });
    }
  });
  
  app.get('/api/tax/zip/:zipCode', async (req, res) => {
    try {
      const { zipCode } = req.params;
      const { getLocalTaxRate, getStateTaxInfo, getEffectiveTaxRate } = await import('../shared/tax-data');
      
      const localTax = getLocalTaxRate(zipCode);
      if (!localTax) {
        return res.status(404).json({ error: 'ZIP code not found in tax database' });
      }
      
      // Try to determine state from ZIP (simplified - in production would use ZIP database)
      const stateCode = determineStateFromZip(zipCode);
      const stateTax = stateCode ? getStateTaxInfo(stateCode) : null;
      const effectiveRate = stateCode ? getEffectiveTaxRate(stateCode, zipCode) : localTax.localTaxRate;
      
      res.json({
        zipCode,
        city: localTax.city,
        county: localTax.county,
        localTaxRate: localTax.localTaxRate,
        stateTaxRate: stateTax?.baseTaxRate || 0,
        effectiveTaxRate: effectiveRate,
        state: stateTax?.stateName || 'Unknown'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get tax rate by ZIP' });
    }
  });
  
  app.get('/api/tax/rules/:state', async (req, res) => {
    try {
      const { state } = req.params;
      const { getStateTaxInfo } = await import('../shared/tax-data');
      
      const stateTax = getStateTaxInfo(state);
      if (!stateTax) {
        return res.status(404).json({ error: `State not found: ${state}` });
      }
      
      res.json(stateTax);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get state tax rules' });
    }
  });
  
  app.post('/api/tax/calculate', async (req, res) => {
    try {
      const taxCalculationSchema = z.object({
        vehiclePrice: z.number().min(0),
        vehicleType: z.enum(['new', 'used', 'certified']).optional(),
        fuelType: z.enum(['gasoline', 'hybrid', 'electric', 'diesel']).optional(),
        stateCode: z.string().length(2),
        zipCode: z.string().optional(),
        countyOverride: z.string().optional(),
        cityOverride: z.string().optional(),
        tradeValue: z.number().min(0).optional(),
        tradePayoff: z.number().min(0).optional(),
        docFee: z.number().min(0).optional(),
        dealerFees: z.number().min(0).optional(),
        aftermarketProducts: z.number().min(0).optional(),
        warrantyAmount: z.number().min(0).optional(),
        gapInsurance: z.number().min(0).optional(),
        maintenanceAmount: z.number().min(0).optional(),
        accessoriesAmount: z.number().min(0).optional(),
        rebates: z.number().min(0).optional(),
        dealerDiscount: z.number().min(0).optional(),
        isFleetSale: z.boolean().optional(),
        isMilitaryBuyer: z.boolean().optional(),
        isNativeAmericanReservation: z.boolean().optional(),
        isOutOfStateBuyer: z.boolean().optional(),
        temporaryRegistration: z.boolean().optional(),
        taxExempt: z.boolean().optional(),
        taxExemptionReason: z.string().optional(),
      });
      
      const options = taxCalculationSchema.parse(req.body);
      
      // Import and use the tax calculator
      const { calculateAutomotiveTax } = await import('../shared/tax-data');
      const { STATE_TAX_DATA, getLocalTaxRate } = await import('../shared/tax-data');
      
      // Get state tax info
      const stateTax = STATE_TAX_DATA[options.stateCode];
      if (!stateTax) {
        return res.status(400).json({ error: `Invalid state code: ${options.stateCode}` });
      }
      
      // Simple tax calculation for now (will be enhanced with full calculator)
      let taxableAmount = options.vehiclePrice;
      
      // Apply trade-in credit
      if (options.tradeValue && stateTax.tradeInCredit !== 'none') {
        const tradeCredit = Math.min(options.tradeValue, options.vehiclePrice);
        if (stateTax.tradeInCredit === 'partial' && stateTax.tradeInCreditLimit) {
          taxableAmount -= Math.min(tradeCredit, stateTax.tradeInCreditLimit);
        } else {
          taxableAmount -= tradeCredit;
        }
      }
      
      // Calculate taxes
      const stateTaxAmount = taxableAmount * stateTax.baseTaxRate;
      let localTaxAmount = 0;
      
      if (options.zipCode) {
        const localTax = getLocalTaxRate(options.zipCode);
        if (localTax) {
          localTaxAmount = taxableAmount * localTax.localTaxRate;
        }
      }
      
      const totalTax = stateTaxAmount + localTaxAmount;
      const totalFees = stateTax.titleFee + stateTax.registrationFeeBase;
      
      res.json({
        taxableAmount,
        stateTax: stateTaxAmount,
        stateTaxRate: stateTax.baseTaxRate,
        localTax: localTaxAmount,
        localTaxRate: localTaxAmount / taxableAmount || 0,
        totalTax,
        effectiveTaxRate: totalTax / taxableAmount || 0,
        titleFee: stateTax.titleFee,
        registrationFee: stateTax.registrationFeeBase,
        totalFees,
        totalTaxAndFees: totalTax + totalFees,
        tradeInTaxSavings: options.tradeValue ? (options.vehiclePrice - taxableAmount) * (stateTax.baseTaxRate + (localTaxAmount / taxableAmount || 0)) : 0,
        notes: [],
        warnings: []
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: error.message || 'Failed to calculate tax' });
      }
    }
  });
  
  // Helper function to determine state from ZIP (simplified)
  function determineStateFromZip(zipCode: string): string | null {
    const zip = parseInt(zipCode.substring(0, 3));
    if (zip >= 100 && zip <= 149) return 'NY';
    if (zip >= 150 && zip <= 196) return 'PA';
    if (zip >= 200 && zip <= 219) return 'DC';
    if (zip >= 220 && zip <= 246) return 'VA';
    if (zip >= 247 && zip <= 269) return 'WV';
    if (zip >= 270 && zip <= 289) return 'NC';
    if (zip >= 290 && zip <= 299) return 'SC';
    if (zip >= 300 && zip <= 319) return 'GA';
    if (zip >= 320 && zip <= 349) return 'FL';
    if (zip >= 350 && zip <= 369) return 'AL';
    if (zip >= 370 && zip <= 385) return 'TN';
    if (zip >= 386 && zip <= 397) return 'MS';
    if (zip >= 400 && zip <= 427) return 'KY';
    if (zip >= 430 && zip <= 459) return 'OH';
    if (zip >= 460 && zip <= 479) return 'IN';
    if (zip >= 480 && zip <= 499) return 'MI';
    if (zip >= 500 && zip <= 528) return 'IA';
    if (zip >= 530 && zip <= 549) return 'WI';
    if (zip >= 550 && zip <= 567) return 'MN';
    if (zip >= 570 && zip <= 577) return 'SD';
    if (zip >= 580 && zip <= 588) return 'ND';
    if (zip >= 590 && zip <= 599) return 'MT';
    if (zip >= 600 && zip <= 629) return 'IL';
    if (zip >= 630 && zip <= 658) return 'MO';
    if (zip >= 660 && zip <= 679) return 'KS';
    if (zip >= 680 && zip <= 693) return 'NE';
    if (zip >= 700 && zip <= 714) return 'LA';
    if (zip >= 716 && zip <= 729) return 'AR';
    if (zip >= 730 && zip <= 749) return 'OK';
    if (zip >= 750 && zip <= 799) return 'TX';
    if (zip >= 800 && zip <= 816) return 'CO';
    if (zip >= 820 && zip <= 831) return 'WY';
    if (zip >= 832 && zip <= 838) return 'ID';
    if (zip >= 840 && zip <= 847) return 'UT';
    if (zip >= 850 && zip <= 865) return 'AZ';
    if (zip >= 870 && zip <= 884) return 'NM';
    if (zip >= 889 && zip <= 899) return 'NV';
    if (zip >= 900 && zip <= 961) return 'CA';
    if (zip >= 967 && zip <= 968) return 'HI';
    if (zip >= 970 && zip <= 979) return 'OR';
    if (zip >= 980 && zip <= 994) return 'WA';
    if (zip >= 995 && zip <= 999) return 'AK';
    return null;
  }
  
  // ===== CALCULATIONS API (for testing/verification) =====
  app.post('/api/calculate/finance', async (req, res) => {
    try {
      const result = calculateFinancePayment(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Calculation failed' });
    }
  });
  
  app.post('/api/calculate/lease', async (req, res) => {
    try {
      const result = calculateLeasePayment(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Calculation failed' });
    }
  });
  
  app.post('/api/calculate/tax', async (req, res) => {
    try {
      const result = calculateSalesTax(req.body);
      res.json({ totalTax: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Calculation failed' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
