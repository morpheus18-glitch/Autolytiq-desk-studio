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
  
  // ===== VIN DECODER =====
  // POST /api/vin/decode - Decode VIN using NHTSA API
  app.post('/api/vin/decode', async (req, res) => {
    try {
      const { vin } = req.body;
      
      if (!vin || typeof vin !== 'string') {
        return res.status(400).json({ error: 'VIN is required' });
      }
      
      const cleanVIN = vin.toUpperCase().trim();
      
      // Basic VIN format validation
      if (cleanVIN.length !== 17) {
        return res.status(400).json({ error: 'VIN must be exactly 17 characters' });
      }
      
      // Check if VIN contains invalid characters (I, O, Q are not allowed)
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVIN)) {
        return res.status(400).json({ error: 'VIN contains invalid characters' });
      }
      
      // Simple in-memory cache
      const cacheKey = `vin:${cleanVIN}`;
      const cached = (global as any).vinCache?.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return res.json(cached.data);
      }
      
      try {
        // Call NHTSA API
        const nhtsa_response = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${cleanVIN}?format=json`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'NextGen-Automotive-Platform/1.0'
            }
          }
        );
        
        if (!nhtsa_response.ok) {
          throw new Error(`NHTSA API returned ${nhtsa_response.status}`);
        }
        
        const nhtsa_data = await nhtsa_response.json();
        
        // Parse the response
        const results = nhtsa_data.Results || [];
        
        const getValue = (name: string): string | undefined => {
          const result = results.find((r: any) => r.Variable === name);
          return result?.Value && result.Value !== 'Not Applicable' && result.Value !== '' 
            ? result.Value 
            : undefined;
        };
        
        // Parse safety features
        const airbags: string[] = [];
        const airbagTypes = [
          'Air Bag-Frontal-Driver',
          'Air Bag-Frontal-Passenger',
          'Air Bag-Knee-Driver',
          'Air Bag-Knee-Passenger',
          'Air Bag-Side Body-Front',
          'Air Bag-Side Head-Front',
          'Curtain Air Bag Locations',
          'Seat Belt Air Bag Locations'
        ];
        
        for (const type of airbagTypes) {
          const value = getValue(type);
          if (value && value !== 'Not Applicable') {
            airbags.push(value);
          }
        }
        
        // Build response
        const decodedData = {
          vin: cleanVIN,
          make: getValue('Make'),
          model: getValue('Model'),
          year: getValue('Model Year') ? parseInt(getValue('Model Year')!) : undefined,
          trim: getValue('Trim') || getValue('Trim2') || getValue('Series') || getValue('Series2'),
          bodyClass: getValue('Body Class'),
          bodyType: getValue('Body Class'),
          doors: getValue('Doors') ? parseInt(getValue('Doors')!) : undefined,
          drivetrain: getValue('Drive Type'),
          engineDisplacement: getValue('Displacement (L)'),
          engineCylinders: getValue('Engine Number of Cylinders') ? parseInt(getValue('Engine Number of Cylinders')!) : undefined,
          engineModel: getValue('Engine Model'),
          fuelType: getValue('Fuel Type - Primary') || getValue('Fuel Type - Secondary'),
          transmission: getValue('Transmission Style'),
          gvwr: getValue('Gross Vehicle Weight Rating From'),
          manufacturer: getValue('Manufacturer Name'),
          plant: [
            getValue('Plant City'),
            getValue('Plant State'),
            getValue('Plant Country')
          ].filter(Boolean).join(', '),
          vehicleType: getValue('Vehicle Type'),
          series: getValue('Series'),
          
          // Safety features
          airbags: airbags.length > 0 ? airbags : undefined,
          abs: getValue('ABS') === 'Standard',
          tpms: getValue('TPMS') === 'Direct' || getValue('TPMS') === 'Indirect',
          esc: getValue('Electronic Stability Control (ESC)') === 'Standard',
          
          // Additional info
          suggestedVIN: getValue('Suggested VIN'),
          errorCode: getValue('Error Code'),
          errorText: getValue('Error Text'),
          decodedAt: new Date().toISOString()
        };
        
        // Remove undefined values
        const cleanedData = Object.fromEntries(
          Object.entries(decodedData).filter(([_, v]) => v !== undefined && v !== '')
        );
        
        // Initialize cache if not exists
        if (!(global as any).vinCache) {
          (global as any).vinCache = new Map();
        }
        
        // Cache the result
        (global as any).vinCache.set(cacheKey, {
          data: cleanedData,
          timestamp: Date.now()
        });
        
        // Limit cache size
        if ((global as any).vinCache.size > 100) {
          const firstKey = (global as any).vinCache.keys().next().value;
          (global as any).vinCache.delete(firstKey);
        }
        
        res.json(cleanedData);
      } catch (fetchError: any) {
        console.error('NHTSA API error:', fetchError);
        res.status(502).json({ error: 'Failed to decode VIN from NHTSA API' });
      }
    } catch (error: any) {
      console.error('VIN decode error:', error);
      res.status(400).json({ error: error.message || 'Failed to decode VIN' });
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

  // ===== ANALYTICS API ENDPOINTS =====
  
  // Helper function to generate analytics data
  function generateAnalyticsData() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    // Generate daily data for the last 6 months
    const days: Date[] = [];
    const current = new Date(sixMonthsAgo);
    while (current <= now) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    // Sales team members
    const salesTeam = [
      { id: '1', name: 'Alex Johnson', role: 'Senior Sales', avatar: '/api/placeholder/40/40' },
      { id: '2', name: 'Sarah Williams', role: 'Sales Manager', avatar: '/api/placeholder/40/40' },
      { id: '3', name: 'Mike Chen', role: 'Sales Associate', avatar: '/api/placeholder/40/40' },
      { id: '4', name: 'Emily Davis', role: 'Finance Manager', avatar: '/api/placeholder/40/40' },
      { id: '5', name: 'James Wilson', role: 'Sales Associate', avatar: '/api/placeholder/40/40' },
      { id: '6', name: 'Lisa Brown', role: 'Internet Sales', avatar: '/api/placeholder/40/40' },
    ];
    
    // Generate realistic deal data with seasonal variation
    const generateDealData = (date: Date) => {
      const month = date.getMonth();
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      
      // Seasonal multipliers (higher in spring/summer)
      const seasonalMultiplier = 1 + (Math.sin((month - 3) * Math.PI / 6) * 0.3);
      
      // Weekend boost
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.4 : 1;
      
      // End of month push
      const endOfMonthMultiplier = dayOfMonth > 25 ? 1.3 : 1;
      
      // Base deals per day
      const baseDeals = 8;
      const dealsCount = Math.round(
        baseDeals * seasonalMultiplier * weekendMultiplier * endOfMonthMultiplier + 
        (Math.random() * 4 - 2)
      );
      
      const deals = [];
      for (let i = 0; i < dealsCount; i++) {
        const salesperson = salesTeam[Math.floor(Math.random() * salesTeam.length)];
        const isNew = Math.random() > 0.4;
        const isLease = Math.random() > 0.7;
        const hasTradeIn = Math.random() > 0.5;
        const financeType = Math.random() > 0.3 ? 'finance' : 'cash';
        
        const basePrice = isNew ? 35000 + Math.random() * 40000 : 15000 + Math.random() * 30000;
        const downPayment = financeType === 'finance' ? basePrice * (0.1 + Math.random() * 0.15) : 0;
        const tradeValue = hasTradeIn ? 5000 + Math.random() * 20000 : 0;
        const grossProfit = basePrice * (0.08 + Math.random() * 0.07);
        
        deals.push({
          date: date.toISOString(),
          salespersonId: salesperson.id,
          salesperson: salesperson.name,
          vehicleType: isNew ? 'new' : 'used',
          dealType: isLease ? 'lease' : 'purchase',
          financeType,
          vehiclePrice: basePrice,
          downPayment,
          tradeInValue: tradeValue,
          grossProfit,
          hasTradeIn,
          fiProductsRevenue: financeType === 'finance' ? 800 + Math.random() * 2000 : 0,
          apr: financeType === 'finance' ? 3.9 + Math.random() * 8 : 0,
          term: financeType === 'finance' ? (isLease ? 36 : 60 + Math.floor(Math.random() * 3) * 12) : 0,
          creditScore: 580 + Math.floor(Math.random() * 270),
          responseTimeMinutes: 5 + Math.floor(Math.random() * 120),
          status: Math.random() > 0.15 ? 'completed' : 'cancelled',
        });
      }
      
      return deals;
    };
    
    // Generate all historical data
    let allDeals: any[] = [];
    days.forEach(day => {
      const dayDeals = generateDealData(day);
      allDeals = allDeals.concat(dayDeals);
    });
    
    // Generate inventory data
    const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Mazda', 'Nissan', 'Volkswagen'];
    const inventory = makes.flatMap(make => {
      const modelCount = 3 + Math.floor(Math.random() * 5);
      return Array(modelCount).fill(0).map((_, i) => ({
        make,
        model: `Model ${String.fromCharCode(65 + i)}`,
        count: Math.floor(5 + Math.random() * 20),
        avgDaysOnLot: Math.floor(15 + Math.random() * 60),
        turnoverRate: 0.3 + Math.random() * 0.5,
      }));
    });
    
    return { deals: allDeals, inventory, salesTeam };
  }
  
  // GET /api/analytics/kpis - Key Performance Indicators
  app.get('/api/analytics/kpis', async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const { deals } = generateAnalyticsData();
      
      const now = new Date();
      let startDate = new Date();
      let previousStartDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(previousStartDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(previousStartDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          previousStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
      }
      
      const currentDeals = deals.filter(d => new Date(d.date) >= startDate && d.status === 'completed');
      const previousDeals = deals.filter(d => 
        new Date(d.date) >= previousStartDate && 
        new Date(d.date) < startDate && 
        d.status === 'completed'
      );
      
      const totalRevenue = currentDeals.reduce((sum, d) => sum + d.vehiclePrice, 0);
      const previousRevenue = previousDeals.reduce((sum, d) => sum + d.vehiclePrice, 0);
      const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      
      const totalProfit = currentDeals.reduce((sum, d) => sum + d.grossProfit + d.fiProductsRevenue, 0);
      const previousProfit = previousDeals.reduce((sum, d) => sum + d.grossProfit + d.fiProductsRevenue, 0);
      const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;
      
      const avgDealValue = currentDeals.length > 0 ? totalRevenue / currentDeals.length : 0;
      const previousAvgDealValue = previousDeals.length > 0 ? previousRevenue / previousDeals.length : 0;
      const avgDealChange = previousAvgDealValue > 0 ? ((avgDealValue - previousAvgDealValue) / previousAvgDealValue) * 100 : 0;
      
      const conversionRate = deals.filter(d => new Date(d.date) >= startDate).length > 0 
        ? (currentDeals.length / deals.filter(d => new Date(d.date) >= startDate).length) * 100 
        : 0;
      
      const financeDeals = currentDeals.filter(d => d.financeType === 'finance');
      const financeRate = currentDeals.length > 0 ? (financeDeals.length / currentDeals.length) * 100 : 0;
      
      const leaseDeals = currentDeals.filter(d => d.dealType === 'lease');
      const leaseRate = currentDeals.length > 0 ? (leaseDeals.length / currentDeals.length) * 100 : 0;
      
      const tradeInRate = currentDeals.length > 0 
        ? (currentDeals.filter(d => d.hasTradeIn).length / currentDeals.length) * 100 
        : 0;
      
      const avgResponseTime = currentDeals.length > 0 
        ? currentDeals.reduce((sum, d) => sum + d.responseTimeMinutes, 0) / currentDeals.length 
        : 0;
      
      const fiAttachmentRate = financeDeals.length > 0 
        ? (financeDeals.filter(d => d.fiProductsRevenue > 0).length / financeDeals.length) * 100 
        : 0;
      
      res.json({
        totalDeals: currentDeals.length,
        dealsChange: previousDeals.length > 0 ? ((currentDeals.length - previousDeals.length) / previousDeals.length) * 100 : 0,
        totalRevenue,
        revenueChange,
        totalProfit,
        profitChange,
        avgDealValue,
        avgDealChange,
        conversionRate,
        financeRate,
        leaseRate,
        tradeInRate,
        avgResponseTime,
        fiAttachmentRate,
        grossProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        avgFinanceAPR: financeDeals.length > 0 
          ? financeDeals.reduce((sum, d) => sum + d.apr, 0) / financeDeals.length 
          : 0,
        avgCreditScore: currentDeals.length > 0 
          ? Math.round(currentDeals.reduce((sum, d) => sum + d.creditScore, 0) / currentDeals.length)
          : 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get KPIs' });
    }
  });
  
  // GET /api/analytics/revenue - Revenue data by period
  app.get('/api/analytics/revenue', async (req, res) => {
    try {
      const { period = 'month', groupBy = 'day' } = req.query;
      const { deals } = generateAnalyticsData();
      
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }
      
      const filteredDeals = deals.filter(d => 
        new Date(d.date) >= startDate && 
        d.status === 'completed'
      );
      
      // Group data
      const grouped = new Map();
      filteredDeals.forEach(deal => {
        const date = new Date(deal.date);
        let key: string;
        
        switch (groupBy) {
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            date: key,
            revenue: 0,
            profit: 0,
            deals: 0,
            newVehicles: 0,
            usedVehicles: 0,
            financeRevenue: 0,
            cashRevenue: 0,
          });
        }
        
        const group = grouped.get(key);
        group.revenue += deal.vehiclePrice;
        group.profit += deal.grossProfit + deal.fiProductsRevenue;
        group.deals += 1;
        if (deal.vehicleType === 'new') group.newVehicles += 1;
        else group.usedVehicles += 1;
        if (deal.financeType === 'finance') group.financeRevenue += deal.vehiclePrice;
        else group.cashRevenue += deal.vehiclePrice;
      });
      
      const data = Array.from(grouped.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get revenue data' });
    }
  });
  
  // GET /api/analytics/deals - Deal analytics
  app.get('/api/analytics/deals', async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const { deals } = generateAnalyticsData();
      
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }
      
      const filteredDeals = deals.filter(d => new Date(d.date) >= startDate);
      const completedDeals = filteredDeals.filter(d => d.status === 'completed');
      
      // Pipeline funnel data
      const pipeline = {
        leads: filteredDeals.length + Math.floor(filteredDeals.length * 0.3),
        qualified: filteredDeals.length,
        proposals: Math.floor(filteredDeals.length * 0.8),
        negotiations: Math.floor(filteredDeals.length * 0.6),
        closed: completedDeals.length,
      };
      
      // Payment distribution
      const paymentRanges = [
        { range: '< $300', count: 0 },
        { range: '$300-$500', count: 0 },
        { range: '$500-$700', count: 0 },
        { range: '$700-$900', count: 0 },
        { range: '> $900', count: 0 },
      ];
      
      completedDeals.forEach(deal => {
        if (deal.financeType === 'finance') {
          const payment = (deal.vehiclePrice - deal.downPayment) / deal.term;
          if (payment < 300) paymentRanges[0].count++;
          else if (payment < 500) paymentRanges[1].count++;
          else if (payment < 700) paymentRanges[2].count++;
          else if (payment < 900) paymentRanges[3].count++;
          else paymentRanges[4].count++;
        }
      });
      
      // Vehicle type breakdown
      const vehicleTypes = {
        new: completedDeals.filter(d => d.vehicleType === 'new').length,
        used: completedDeals.filter(d => d.vehicleType === 'used').length,
        certified: Math.floor(completedDeals.filter(d => d.vehicleType === 'used').length * 0.3),
      };
      
      // Finance type breakdown
      const financeTypes = {
        cash: completedDeals.filter(d => d.financeType === 'cash').length,
        finance: completedDeals.filter(d => d.financeType === 'finance' && d.dealType === 'purchase').length,
        lease: completedDeals.filter(d => d.dealType === 'lease').length,
      };
      
      // Credit score distribution
      const creditDistribution = [
        { range: '< 600', count: completedDeals.filter(d => d.creditScore < 600).length },
        { range: '600-650', count: completedDeals.filter(d => d.creditScore >= 600 && d.creditScore < 650).length },
        { range: '650-700', count: completedDeals.filter(d => d.creditScore >= 650 && d.creditScore < 700).length },
        { range: '700-750', count: completedDeals.filter(d => d.creditScore >= 700 && d.creditScore < 750).length },
        { range: '> 750', count: completedDeals.filter(d => d.creditScore >= 750).length },
      ];
      
      res.json({
        pipeline,
        paymentDistribution: paymentRanges,
        vehicleTypes,
        financeTypes,
        creditDistribution,
        avgDownPayment: completedDeals.filter(d => d.financeType === 'finance').length > 0
          ? completedDeals.filter(d => d.financeType === 'finance').reduce((sum, d) => sum + d.downPayment, 0) / 
            completedDeals.filter(d => d.financeType === 'finance').length
          : 0,
        avgTradeValue: completedDeals.filter(d => d.hasTradeIn).length > 0
          ? completedDeals.filter(d => d.hasTradeIn).reduce((sum, d) => sum + d.tradeInValue, 0) / 
            completedDeals.filter(d => d.hasTradeIn).length
          : 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get deal analytics' });
    }
  });
  
  // GET /api/analytics/inventory - Inventory metrics
  app.get('/api/analytics/inventory', async (req, res) => {
    try {
      const { inventory } = generateAnalyticsData();
      
      // Calculate inventory metrics
      const totalUnits = inventory.reduce((sum, item) => sum + item.count, 0);
      const avgDaysOnLot = inventory.reduce((sum, item) => sum + item.avgDaysOnLot * item.count, 0) / totalUnits;
      const avgTurnoverRate = inventory.reduce((sum, item) => sum + item.turnoverRate * item.count, 0) / totalUnits;
      
      // Top performers (low days on lot, high turnover)
      const hotInventory = [...inventory]
        .sort((a, b) => b.turnoverRate - a.turnoverRate)
        .slice(0, 5)
        .map(item => ({
          ...item,
          performance: 'hot',
        }));
      
      // Slow movers (high days on lot, low turnover)
      const coldInventory = [...inventory]
        .sort((a, b) => a.turnoverRate - b.turnoverRate)
        .slice(0, 5)
        .map(item => ({
          ...item,
          performance: 'cold',
        }));
      
      // Make/Model popularity
      const makePopularity = inventory.reduce((acc: any[], item) => {
        const existing = acc.find(m => m.make === item.make);
        if (existing) {
          existing.count += item.count;
          existing.models.push({ model: item.model, count: item.count });
        } else {
          acc.push({
            make: item.make,
            count: item.count,
            models: [{ model: item.model, count: item.count }],
          });
        }
        return acc;
      }, []).sort((a, b) => b.count - a.count);
      
      // Age distribution (simulated)
      const ageDistribution = [
        { range: '0-30 days', count: Math.floor(totalUnits * 0.35), percentage: 35 },
        { range: '31-60 days', count: Math.floor(totalUnits * 0.30), percentage: 30 },
        { range: '61-90 days', count: Math.floor(totalUnits * 0.20), percentage: 20 },
        { range: '> 90 days', count: Math.floor(totalUnits * 0.15), percentage: 15 },
      ];
      
      res.json({
        totalUnits,
        avgDaysOnLot: Math.round(avgDaysOnLot),
        avgTurnoverRate,
        optimalInventoryLevel: Math.round(totalUnits * 1.1),
        currentUtilization: 87 + Math.random() * 10,
        hotInventory,
        coldInventory,
        makePopularity,
        ageDistribution,
        projectedShortages: [
          { make: 'Toyota', model: 'Camry', daysUntilShortage: 5 },
          { make: 'Honda', model: 'CR-V', daysUntilShortage: 8 },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get inventory metrics' });
    }
  });
  
  // GET /api/analytics/team - Team performance data
  app.get('/api/analytics/team', async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const { deals, salesTeam } = generateAnalyticsData();
      
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }
      
      const filteredDeals = deals.filter(d => 
        new Date(d.date) >= startDate && 
        d.status === 'completed'
      );
      
      // Calculate performance metrics for each team member
      const performance = salesTeam.map(member => {
        const memberDeals = filteredDeals.filter(d => d.salespersonId === member.id);
        const revenue = memberDeals.reduce((sum, d) => sum + d.vehiclePrice, 0);
        const profit = memberDeals.reduce((sum, d) => sum + d.grossProfit + d.fiProductsRevenue, 0);
        const avgResponseTime = memberDeals.length > 0
          ? memberDeals.reduce((sum, d) => sum + d.responseTimeMinutes, 0) / memberDeals.length
          : 0;
        
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar,
          deals: memberDeals.length,
          revenue,
          profit,
          avgDealValue: memberDeals.length > 0 ? revenue / memberDeals.length : 0,
          avgProfit: memberDeals.length > 0 ? profit / memberDeals.length : 0,
          conversionRate: 75 + Math.random() * 20,
          avgResponseTime: Math.round(avgResponseTime),
          customerSatisfaction: 4.2 + Math.random() * 0.7,
          fiAttachmentRate: memberDeals.filter(d => d.financeType === 'finance' && d.fiProductsRevenue > 0).length /
                          Math.max(memberDeals.filter(d => d.financeType === 'finance').length, 1) * 100,
        };
      }).sort((a, b) => b.revenue - a.revenue);
      
      // Activity metrics
      const activities = {
        calls: performance.map(p => ({ name: p.name, count: Math.floor(50 + Math.random() * 100) })),
        emails: performance.map(p => ({ name: p.name, count: Math.floor(30 + Math.random() * 70) })),
        appointments: performance.map(p => ({ name: p.name, count: Math.floor(10 + Math.random() * 30) })),
        testDrives: performance.map(p => ({ name: p.name, count: Math.floor(5 + Math.random() * 20) })),
      };
      
      // Goals vs actual
      const goals = performance.map(p => ({
        name: p.name,
        dealsGoal: 20,
        dealsActual: p.deals,
        revenueGoal: 500000,
        revenueActual: p.revenue,
        profitGoal: 40000,
        profitActual: p.profit,
      }));
      
      res.json({
        leaderboard: performance,
        activities,
        goals,
        teamAvgResponseTime: Math.round(performance.reduce((sum, p) => sum + p.avgResponseTime, 0) / performance.length),
        teamAvgSatisfaction: (performance.reduce((sum, p) => sum + p.customerSatisfaction, 0) / performance.length).toFixed(1),
        topPerformer: performance[0],
        mostImproved: performance[Math.floor(Math.random() * performance.length)],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get team performance data' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
