import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import rateLimit from "express-rate-limit";
import { insertCustomerSchema, insertVehicleSchema, insertDealSchema, insertDealScenarioSchema, insertTradeVehicleSchema, insertTaxJurisdictionSchema } from "@shared/schema";
import { calculateFinancePayment, calculateLeasePayment, calculateSalesTax } from "./calculations";

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
      const significantFields = ['vehicleId', 'vehiclePrice', 'apr', 'term', 'moneyFactor', 'residualValue', 'downPayment'];
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
