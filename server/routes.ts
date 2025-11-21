import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertVehicleSchema, insertDealSchema, insertDealScenarioSchema, insertTradeVehicleSchema, insertTaxJurisdictionSchema, insertQuickQuoteSchema, insertQuickQuoteContactSchema } from "@shared/schema";
import { calculateFinancePayment, calculateLeasePayment, calculateSalesTax } from "./calculations";
import { z } from "zod";
import { aiService, type ChatMessage, type DealContext } from "./ai-service";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { setupAuthRoutes } from "./auth-routes";
import {
  initializeSecurity,
  authRateLimiter,
  passwordResetRateLimiter,
  userCreationRateLimiter,
} from "./security";
import taxRoutes from "./tax-routes";
import localTaxRoutes from "./local-tax-routes";
import taxEngineRoutes from "./tax-engine-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // SECURITY INITIALIZATION
  // ============================================================================
  // Initialize all security middleware (helmet, rate limiting, sanitization)
  // MUST be called BEFORE any route setup
  initializeSecurity(app);

  // ============================================================================
  // MOUNT PUBLIC ROUTES BEFORE AUTH SETUP
  // ============================================================================
  // TEMPORARY: Setup admin route (no auth required)
  const setupAdminRoute = (await import('./setup-admin-route')).default;
  app.use(setupAdminRoute);

  // CRITICAL: Public webhooks MUST be mounted BEFORE setupAuth() to avoid
  // having session/passport middleware applied to them
  const { default: emailRoutes, publicRouter: emailPublicRoutes } = await import('./email-routes');
  app.use('/api/webhooks', emailPublicRoutes);

  // ============================================================================
  // SETUP AUTHENTICATION & RATE LIMITING
  // ============================================================================
  // Apply STRICT rate limiting to auth endpoints BEFORE setupAuth
  // This prevents brute force attacks and account enumeration
  app.use('/api/register', authRateLimiter);
  app.use('/api/login', authRateLimiter);
  app.use('/api/auth/request-reset', passwordResetRateLimiter);
  app.use('/api/auth/reset-password', passwordResetRateLimiter);
  app.use('/api/admin/users', userCreationRateLimiter);

  // Setup authentication (session + passport middleware + auth routes)
  setupAuth(app);

  // Setup auth routes (preferences, settings, password reset, 2FA, audit, permissions)
  setupAuthRoutes(app);

  // ============================================================================
  // PROTECTED ROUTES (ALL REQUIRE AUTHENTICATION)
  // ============================================================================
  
  // Setup tax calculation routes (AutoTaxEngine endpoints)
  app.use('/api/tax', taxRoutes);

  // Setup local tax rate lookup routes (ZIP code to local rates)
  app.use('/api/tax', localTaxRoutes);

  // Setup centralized tax engine routes (customer-based tax calculation)
  app.use('/api/tax', taxEngineRoutes);

  // Setup address validation route (validates customer addresses for tax calculation)
  const { validateAddressHandler } = await import('./address-validation');
  app.post('/api/address/validate', requireAuth, validateAddressHandler);

  // Setup rooftop configuration routes (multi-location support)
  const rooftopRoutes = (await import('./rooftop-routes')).default;
  app.use('/api/rooftops', rooftopRoutes);
  
  // Mount protected email routes (require authentication)
  app.use('/api/email', requireAuth, emailRoutes);

  // Setup email webhook routes (NO AUTH - called by Resend servers)
  const emailWebhookRoutes = (await import('./email-webhook-routes')).default;
  app.use('/api/webhooks/email', emailWebhookRoutes);

  // ===== USERS =====
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const allUsers = await storage.getUsers(dealershipId);
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Admin: Create new user
  app.post('/api/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { username, email, fullName, password, role } = req.body;
      const dealershipId = (req.user as any)?.dealershipId;

      // Check if username/email already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      // Create user - admins create users as ACTIVE by default
      const newUser = await storage.createUser({
        username,
        email,
        fullName,
        password: hashedPassword,
        role: role || 'salesperson',
        isActive: true, // Admin-created users are active immediately
      }, dealershipId);

      // TODO: Send welcome email with credentials
      // Note: sendWelcomeEmail function needs to be implemented in email-service.ts
      // const { sendWelcomeEmail } = await import('./email-service');
      // await sendWelcomeEmail(newUser.email, username, password).catch(err =>
      //   console.error('Failed to send welcome email:', err)
      // );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  // Admin: Update user
  app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow password updates through this endpoint
      delete updates.password;
      delete updates.id;
      delete updates.createdAt;
      delete updates.dealershipId;

      const updatedUser = await storage.updateUser(id, updates);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: error.message || 'Failed to update user' });
    }
  });

  // ===== CUSTOMERS =====
  app.get('/api/customers', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const customers = await storage.searchCustomers('', dealershipId);
      res.json(customers);
    } catch (error: any) {
      console.error('[GET /api/customers] Error:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to get customers' });
    }
  });
  
  app.get('/api/customers/search', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const query = String(req.query.q || '');
      const customers = await storage.searchCustomers(query, dealershipId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search customers' });
    }
  });
  
  app.get('/api/customers/:id', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify customer belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Verify customer belongs to same dealership as authenticated user
      if (customer.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get customer' });
    }
  });
  
  app.post('/api/customers', requireAuth, async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      
      // Extract dealershipId from authenticated user for multi-tenant security
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership to create customers' });
      }
      
      const customer = await storage.createCustomer(data, dealershipId);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create customer' });
    }
  });
  
  app.patch('/api/customers/:id', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify customer belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      // Verify customer exists and belongs to same dealership
      const existingCustomer = await storage.getCustomer(req.params.id);
      if (!existingCustomer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      if (existingCustomer.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const customer = await storage.updateCustomer(req.params.id, req.body);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update customer' });
    }
  });

  // Get customer history (deals, emails, quotes)
  app.get('/api/customers/:id/history', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify customer belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      // Verify customer exists and belongs to same dealership
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      if (customer.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const history = await storage.getCustomerHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      console.error('[GET /api/customers/:id/history] Error:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to get customer history' });
    }
  });

  // Get customer notes
  app.get('/api/customers/:id/notes', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify customer belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      if (customer.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const notes = await storage.getCustomerNotes(req.params.id);
      res.json(notes);
    } catch (error: any) {
      console.error('[GET /api/customers/:id/notes] Error:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to get customer notes' });
    }
  });

  // Create customer note
  app.post('/api/customers/:id/notes', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify customer belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      const userId = (req.user as any)?.id;

      if (!dealershipId || !userId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      if (customer.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const { content, noteType = 'general', isImportant = false, dealId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      const note = await storage.createCustomerNote({
        customerId: req.params.id,
        userId,
        dealershipId,
        content: content.trim(),
        noteType,
        isImportant,
        dealId,
      });

      res.status(201).json(note);
    } catch (error: any) {
      console.error('[POST /api/customers/:id/notes] Error:', error.message, error.stack);
      res.status(400).json({ error: error.message || 'Failed to create customer note' });
    }
  });

  // ===== APPOINTMENTS =====
  // Get appointments for a specific date
  app.get('/api/appointments/date/:date', requireAuth, async (req, res) => {
    try {
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const date = new Date(req.params.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const appointments = await storage.getAppointmentsByDate(date, dealershipId);
      res.json(appointments);
    } catch (error: any) {
      console.error('[GET /api/appointments/date/:date] Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  // Get all appointments with optional filters
  app.get('/api/appointments', requireAuth, async (req, res) => {
    try {
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const options: any = {};
      if (req.query.startDate) options.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) options.endDate = new Date(req.query.endDate as string);
      if (req.query.userId) options.userId = req.query.userId as string;
      if (req.query.customerId) options.customerId = req.query.customerId as string;

      const appointments = await storage.getAppointments(dealershipId, options);
      res.json(appointments);
    } catch (error: any) {
      console.error('[GET /api/appointments] Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  // Create appointment
  app.post('/api/appointments', requireAuth, async (req, res) => {
    try {
      const dealershipId = (req.user as any)?.dealershipId;
      const userId = (req.user as any)?.id;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const { title, description, appointmentType, scheduledAt, duration, location, customerId, dealId, vehicleId, notes } = req.body;

      if (!title || !scheduledAt) {
        return res.status(400).json({ error: 'Title and scheduled time are required' });
      }

      const appointment = await storage.createAppointment({
        title,
        description,
        appointmentType: appointmentType || 'consultation',
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        location: location || 'dealership',
        customerId: customerId || null,
        dealId: dealId || null,
        vehicleId: vehicleId || null,
        notes,
        userId: req.body.userId || userId, // Allow assigning to another user
        dealershipId,
      });

      res.status(201).json(appointment);
    } catch (error: any) {
      console.error('[POST /api/appointments] Error:', error.message);
      res.status(400).json({ error: error.message || 'Failed to create appointment' });
    }
  });

  // Update appointment
  app.patch('/api/appointments/:id', requireAuth, async (req, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(appointment);
    } catch (error: any) {
      console.error('[PATCH /api/appointments/:id] Error:', error.message);
      res.status(400).json({ error: error.message || 'Failed to update appointment' });
    }
  });

  // Delete appointment
  app.delete('/api/appointments/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[DELETE /api/appointments/:id] Error:', error.message);
      res.status(400).json({ error: error.message || 'Failed to delete appointment' });
    }
  });

  // ===== VEHICLES =====
  app.get('/api/vehicles/search', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const query = String(req.query.q || '');
      const vehicles = await storage.searchVehicles(query, dealershipId);
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search vehicles' });
    }
  });
  
  app.get('/api/vehicles/stock/:stockNumber', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const vehicle = await storage.getVehicleByStock(req.params.stockNumber, dealershipId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get vehicle' });
    }
  });
  
  app.get('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify vehicle belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      // Verify vehicle belongs to same dealership as authenticated user
      if (vehicle.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get vehicle' });
    }
  });
  
  app.post('/api/vehicles', requireAuth, async (req, res) => {
    try {
      // SECURITY: Inject dealershipId from authenticated user for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data, dealershipId);
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
        
        // Parse the response - DecodeVinValuesExtended returns Results[0] as a flat object
        const results = nhtsa_data.Results || [];
        
        if (results.length === 0) {
          throw new Error('No results returned from NHTSA API');
        }
        
        // NHTSA returns a single object with all fields as properties
        const vehicleData = results[0];
        
        const getValue = (name: string): string | undefined => {
          const value = vehicleData[name];
          return value && value !== 'Not Applicable' && value !== '' 
            ? value 
            : undefined;
        };
        
        // Parse safety features - use correct NHTSA field names
        const airbags: string[] = [];
        const airbagFields = [
          'AirBagLocFront',
          'AirBagLocKnee',
          'AirBagLocSide',
          'AirBagLocCurtain',
          'AirBagLocSeatCushion'
        ];
        
        for (const field of airbagFields) {
          const value = getValue(field);
          if (value && value !== 'Not Applicable') {
            airbags.push(value);
          }
        }
        
        // Build response - use correct field names from NHTSA flat format
        const decodedData = {
          vin: cleanVIN,
          make: getValue('Make'),
          model: getValue('Model'),
          year: getValue('ModelYear') ? parseInt(getValue('ModelYear')!) : undefined,
          trim: getValue('Trim') || getValue('Trim2') || getValue('Series') || getValue('Series2'),
          bodyClass: getValue('BodyClass'),
          bodyType: getValue('BodyClass'),
          doors: getValue('Doors') ? parseInt(getValue('Doors')!) : undefined,
          drivetrain: getValue('DriveType'),
          engineDisplacement: getValue('DisplacementL'),
          engineCylinders: getValue('EngineCylinders') ? parseInt(getValue('EngineCylinders')!) : undefined,
          engineModel: getValue('EngineModel'),
          fuelType: getValue('FuelTypePrimary') || getValue('FuelTypeSecondary'),
          transmission: getValue('TransmissionStyle'),
          gvwr: getValue('GVWR'),
          manufacturer: getValue('Manufacturer'),
          plant: [
            getValue('PlantCity'),
            getValue('PlantState'),
            getValue('PlantCountry')
          ].filter(Boolean).join(', '),
          vehicleType: getValue('VehicleType'),
          series: getValue('Series'),
          
          // Safety features
          airbags: airbags.length > 0 ? airbags : undefined,
          abs: getValue('ABS') === 'Standard',
          tpms: getValue('TPMS') === 'Direct' || getValue('TPMS') === 'Indirect',
          esc: getValue('ESC') === 'Standard',
          
          // Additional info
          suggestedVIN: getValue('SuggestedVIN'),
          errorCode: getValue('ErrorCode'),
          errorText: getValue('ErrorText'),
          decodedAt: new Date().toISOString()
        };
        
        // Debug logging
        console.log('[VIN Decoder] Parsed data:', {
          vin: decodedData.vin,
          make: decodedData.make,
          model: decodedData.model,
          year: decodedData.year,
          trim: decodedData.trim
        });
        
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
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(401).json({ error: 'User dealership not found' });
      }
      const vehicle = await storage.createVehicle(data, dealershipId);
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
  app.get('/api/deals/:dealId/trades', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify deal belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const { dealId } = req.params;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
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
          payoffTo: z.string().optional(),
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
          payoffTo: z.string().optional(),
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

  // Lookup tax jurisdiction by ZIP code
  app.get('/api/tax-jurisdictions/lookup', async (req, res) => {
    try {
      const zipCode = req.query.zipCode as string;
      if (!zipCode || zipCode.length !== 5) {
        return res.status(400).json({ error: 'Invalid ZIP code' });
      }

      // Try to find jurisdiction by ZIP code
      const zipLookup = await storage.getZipCodeLookup(zipCode);
      if (!zipLookup) {
        return res.status(404).json({ error: 'ZIP code not found in tax database' });
      }

      // Get the full jurisdiction details
      const jurisdiction = await storage.getTaxJurisdictionById(zipLookup.taxJurisdictionId);
      if (!jurisdiction) {
        return res.status(404).json({ error: 'Tax jurisdiction not found' });
      }

      // Return jurisdiction with city/state from ZIP lookup
      res.json({
        ...jurisdiction,
        city: zipLookup.city || jurisdiction.city,
        state: zipLookup.state || jurisdiction.state,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to lookup tax jurisdiction' });
    }
  });

  // ===== QUICK QUOTES =====
  app.post('/api/quick-quotes', async (req, res) => {
    try {
      const data = insertQuickQuoteSchema.parse(req.body);
      const quote = await storage.createQuickQuote(data);
      res.status(201).json(quote);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create quick quote' });
    }
  });

  app.patch('/api/quick-quotes/:id', async (req, res) => {
    try {
      const quoteId = req.params.id;
      
      // Validate payload using schema subset
      const data = insertQuickQuoteSchema.pick({ quotePayload: true }).parse(req.body);

      // Check quote exists
      const existingQuote = await storage.getQuickQuote(quoteId);
      if (!existingQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const quote = await storage.updateQuickQuotePayload(quoteId, data.quotePayload);
      res.json(quote);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update quick quote' });
    }
  });

  app.post('/api/quick-quotes/:id/text', async (req, res) => {
    try {
      // Validate request body
      const contactData = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        phone: z.string().min(10, 'Phone number must be at least 10 digits'),
      }).parse(req.body);

      const quoteId = req.params.id;

      // Get the quote
      const quote = await storage.getQuickQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Save contact info
      const contact = await storage.createQuickQuoteContact({
        quickQuoteId: quoteId,
        name: contactData.name,
        phone: contactData.phone,
        smsDeliveryStatus: 'pending',
      });

      // TODO: Send SMS via Twilio integration
      // For now, just mark as sent
      await storage.updateQuickQuoteContactStatus(contact.id, 'delivered', new Date());
      
      // Update quote status
      await storage.updateQuickQuote(quoteId, { status: 'sent' });

      res.json({ success: true, contactId: contact.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to send text quote' });
    }
  });

  app.post('/api/quick-quotes/:id/convert', requireAuth, async (req, res) => {
    try {
      const quoteId = req.params.id;

      // Get the quote
      const quote = await storage.getQuickQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      if (quote.status === 'converted') {
        return res.status(400).json({ error: 'Quote already converted' });
      }

      const payload = quote.quotePayload as any;

      // SECURITY: Use authenticated user's dealershipId for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership to convert quotes' });
      }
      
      // Get salesperson or use authenticated user as fallback
      let salespersonId = quote.salespersonId;
      if (!salespersonId) {
        // Use the authenticated user as salesperson instead of arbitrary first user
        salespersonId = (req.user as any)?.id;
        if (!salespersonId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
      } else {
        // Verify salesperson belongs to the same dealership
        const salesperson = await storage.getUser(salespersonId);
        if (!salesperson) {
          return res.status(400).json({ error: 'Salesperson not found' });
        }
        if (salesperson.dealershipId !== dealershipId) {
          return res.status(403).json({ error: 'Cannot convert quote with salesperson from different dealership' });
        }
      }

      // ATOMIC QUOTE CONVERSION
      // Use atomic operations to ensure all-or-nothing conversion
      const { createDeal } = await import('./database/atomic-operations');

      const result = await createDeal({
        dealershipId,
        salespersonId,
        vehicleId: quote.vehicleId || undefined,
        customerData: {
          firstName: 'Quick',
          lastName: 'Quote Customer',
          email: quote.customerEmail || undefined,
          phone: quote.customerPhone || undefined,
        },
        scenarioData: {
          name: 'Quick Quote Conversion',
          scenarioType: 'FINANCE_DEAL',
          vehiclePrice: String(payload.vehiclePrice || 0),
          downPayment: String(payload.downPayment || 0),
          apr: String(payload.apr || 12.9),
          term: payload.termMonths || 60,
          tradeAllowance: String(payload.tradeValue || 0),
          tradePayoff: String(payload.tradePayoff || 0),
        },
      });

      // Update quote status (outside transaction - not critical)
      await storage.updateQuickQuote(quoteId, {
        status: 'converted',
        dealId: result.deal.id
      });

      res.json({
        success: true,
        dealId: result.deal.id,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to convert quote' });
    }
  });
  
  // ===== DEALS =====
  app.get('/api/deals/stats', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const stats = await storage.getDealsStats(dealershipId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get deal statistics' });
    }
  });
  
  app.get('/api/deals', requireAuth, async (req, res) => {
    try {
      // SECURITY: Filter by authenticated user's dealership for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '20'));
      const search = req.query.search ? String(req.query.search) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      
      const result = await storage.getDeals({ page, pageSize, search, status, dealershipId });
      res.json(result);
    } catch (error) {
      console.error('[ERROR] Failed to get deals:', error);
      res.status(500).json({ error: 'Failed to get deals' });
    }
  });
  
  app.get('/api/deals/:id', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify deal belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      res.json(deal);
    } catch (error) {
      console.error(`[ERROR] Failed to get deal ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get deal' });
    }
  });
  
  app.post('/api/deals', requireAuth, async (req, res) => {
    try {
      const data = insertDealSchema.parse(req.body);

      // SECURITY: Extract dealershipId from authenticated user for multi-tenant isolation
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership to create deals' });
      }

      // ATOMIC DEAL CREATION
      // Uses atomic operations to ensure all-or-nothing creation
      // No more orphaned customers, vehicles, or scenarios
      const { createDeal, ValidationError, ResourceNotFoundError, VehicleNotAvailableError, MultiTenantViolationError } = await import('./database/atomic-operations');

      try {
        const result = await createDeal({
          dealershipId,
          salespersonId: data.salespersonId,
          customerId: data.customerId || undefined,
          vehicleId: data.vehicleId || undefined,
          tradeVehicleId: data.tradeVehicleId || undefined,
          initialState: data.dealState || 'DRAFT',
        });

        // Return comprehensive result
        res.status(201).json({
          success: true,
          data: {
            deal: result.deal,
            scenario: result.scenario,
            customer: result.customer,
            vehicle: result.vehicle,
          },
        });
      } catch (error: any) {
        // Handle specific error types with appropriate status codes
        if (error instanceof ValidationError) {
          return res.status(400).json({ success: false, error: error.message });
        }
        if (error instanceof ResourceNotFoundError) {
          return res.status(404).json({ success: false, error: error.message });
        }
        if (error instanceof VehicleNotAvailableError) {
          return res.status(409).json({ success: false, error: error.message });
        }
        if (error instanceof MultiTenantViolationError) {
          return res.status(403).json({ success: false, error: error.message });
        }

        // Generic error
        console.error('[ERROR] Deal creation failed:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create deal. Please try again.'
        });
      }
    } catch (error: any) {
      // Schema validation error
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }

      console.error('[ERROR] Unexpected error in deal creation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create deal'
      });
    }
  });
  
  // Attach customer to deal and generate deal number
  app.patch('/api/deals/:id/attach-customer', async (req, res) => {
    try {
      const { id } = req.params;
      const { customerId } = z.object({ customerId: z.string().uuid() }).parse(req.body);
      
      const deal = await storage.attachCustomerToDeal(id, customerId);
      
      res.json(deal);
    } catch (error: any) {
      // Return 403 for dealership mismatch, 404 for not found, 400 for other errors
      if (error.message?.includes('same dealership')) {
        res.status(403).json({ error: 'Forbidden' });
      } else if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Not found' });
      } else {
        res.status(400).json({ error: error.message || 'Failed to attach customer to deal' });
      }
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
  
  // ===== FEE PACKAGE TEMPLATES =====
  app.get('/api/templates', async (req, res) => {
    try {
      const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
      const templates = await storage.getFeePackageTemplates(active);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get templates' });
    }
  });
  
  app.get('/api/templates/:id', async (req, res) => {
    try {
      const template = await storage.getFeePackageTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get template' });
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
      
      console.log('[POST /api/deals/:dealId/scenarios] Request body:', JSON.stringify(req.body, null, 2));
      const data = insertDealScenarioSchema.parse({ ...req.body, dealId });
      const scenario = await storage.createScenario(data);
      
      // Create audit log only if we have a valid userId
      if (deal.salespersonId) {
        await storage.createAuditLog({
          dealId,
          scenarioId: scenario.id,
          userId: deal.salespersonId,
          action: 'create',
          entityType: 'scenario',
          entityId: scenario.id,
          metadata: { scenarioType: scenario.scenarioType, name: scenario.name },
        });
      } else {
        console.warn('[POST /api/deals/:dealId/scenarios] Skipping audit log creation - deal has no salespersonId');
      }
      
      res.status(201).json(scenario);
    } catch (error: any) {
      console.error('[POST /api/deals/:dealId/scenarios] Error:', error);
      console.error('[POST /api/deals/:dealId/scenarios] Request body was:', req.body);
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
  
  app.post('/api/deals/:dealId/scenarios/:scenarioId/apply-template', async (req, res) => {
    try {
      const { dealId, scenarioId } = req.params;
      const { templateId } = req.body;
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const scenario = await storage.getScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }
      
      const template = await storage.getFeePackageTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      const scenarioDealerFees = Array.isArray(scenario.dealerFees) ? scenario.dealerFees : [];
      const scenarioAccessories = Array.isArray(scenario.accessories) ? scenario.accessories : [];
      const scenarioProducts = Array.isArray(scenario.aftermarketProducts) ? scenario.aftermarketProducts : [];
      
      const templateDealerFees = Array.isArray(template.dealerFees) ? template.dealerFees : [];
      const templateAccessories = Array.isArray(template.accessories) ? template.accessories : [];
      const templateProducts = Array.isArray(template.aftermarketProducts) ? template.aftermarketProducts : [];
      
      const updatedScenario = await storage.updateScenario(scenarioId, {
        dealerFees: [...scenarioDealerFees, ...templateDealerFees],
        accessories: [...scenarioAccessories, ...templateAccessories],
        aftermarketProducts: [...scenarioProducts, ...templateProducts],
      });
      
      await storage.createAuditLog({
        dealId,
        scenarioId,
        userId: deal.salespersonId,
        action: 'apply_template',
        entityType: 'scenario',
        entityId: scenarioId,
        metadata: { 
          templateId: template.id,
          templateName: template.name,
          itemsAdded: {
            dealerFees: templateDealerFees.length,
            accessories: templateAccessories.length,
            aftermarketProducts: templateProducts.length,
          }
        },
      });
      
      res.json(updatedScenario);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to apply template' });
    }
  });
  
  // ===== AUDIT LOGS =====
  app.get('/api/deals/:id/audit', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify deal belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }
      
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      const logs = await storage.getDealAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  });

  // ===== PDF GENERATION =====
  app.post('/api/deals/:id/pdf', requireAuth, async (req, res) => {
    try {
      // SECURITY: Verify deal belongs to authenticated user's dealership
      const dealershipId = (req.user as any)?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const { scenarioId } = req.body;

      // Import Puppeteer dynamically to avoid loading it on every request
      const puppeteer = await import('puppeteer');

      // Generate PDF using Puppeteer
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Build HTML content for the deal summary
      const scenario = deal.scenarios?.find(s => s.id === scenarioId) || deal.scenarios?.[0];
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Deal Summary - ${deal.dealNumber || 'Draft'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 40px;
      color: #1f2937;
    }
    h1 { font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { font-size: 18px; margin-top: 30px; margin-bottom: 15px; color: #3b82f6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .summary-box { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-value { font-size: 20px; font-weight: 600; margin-top: 5px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Deal Summary: ${deal.dealNumber || 'Draft Deal'}</h1>

  <div style="margin-bottom: 30px;">
    <span class="badge badge-${deal.dealState?.toLowerCase()}">${deal.dealState?.replace('_', ' ')}</span>
  </div>

  <h2>Customer Information</h2>
  ${deal.customer ? `
    <table>
      <tr><th>Name</th><td>${deal.customer.firstName} ${deal.customer.lastName}</td></tr>
      ${deal.customer.email ? `<tr><th>Email</th><td>${deal.customer.email}</td></tr>` : ''}
      ${deal.customer.phone ? `<tr><th>Phone</th><td>${deal.customer.phone}</td></tr>` : ''}
      ${deal.customer.address ? `<tr><th>Address</th><td>${deal.customer.address}${deal.customer.city ? `, ${deal.customer.city}` : ''}${deal.customer.state ? `, ${deal.customer.state}` : ''}${deal.customer.zipCode ? ` ${deal.customer.zipCode}` : ''}</td></tr>` : ''}
    </table>
  ` : '<p>No customer attached</p>'}

  <h2>Vehicle Information</h2>
  ${deal.vehicle ? `
    <table>
      <tr><th>Vehicle</th><td>${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}${deal.vehicle.trim ? ` ${deal.vehicle.trim}` : ''}</td></tr>
      <tr><th>VIN</th><td>${deal.vehicle.vin}</td></tr>
      <tr><th>Stock Number</th><td>${deal.vehicle.stockNumber || 'N/A'}</td></tr>
      <tr><th>Mileage</th><td>${deal.vehicle.mileage.toLocaleString()} miles</td></tr>
      <tr><th>Condition</th><td>${deal.vehicle.condition}</td></tr>
    </table>
  ` : '<p>No vehicle selected</p>'}

  ${scenario ? `
    <h2>Payment Summary</h2>
    <div class="summary-grid">
      <div class="summary-box">
        <div class="summary-label">Vehicle Price</div>
        <div class="summary-value">$${Number(scenario.vehiclePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-box">
        <div class="summary-label">Down Payment</div>
        <div class="summary-value">$${Number(scenario.downPayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-box">
        <div class="summary-label">Total Tax</div>
        <div class="summary-value">$${Number(scenario.totalTax).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-box">
        <div class="summary-label">Total Fees</div>
        <div class="summary-value">$${Number(scenario.totalFees).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    </div>

    ${scenario.scenarioType !== 'CASH_DEAL' ? `
      <h2>Financing Details</h2>
      <table>
        <tr><th>Type</th><td>${scenario.scenarioType.replace('_', ' ')}</td></tr>
        <tr><th>Amount Financed</th><td>$${Number(scenario.amountFinanced).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
        ${scenario.apr ? `<tr><th>APR</th><td>${Number(scenario.apr)}%</td></tr>` : ''}
        ${scenario.term ? `<tr><th>Term</th><td>${scenario.term} months</td></tr>` : ''}
        <tr><th>Monthly Payment</th><td>$${Number(scenario.monthlyPayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      </table>
    ` : ''}

    <div class="summary-box" style="margin-top: 30px; background: #eff6ff; border-color: #3b82f6;">
      <div class="summary-label">Total Amount / Cash Due</div>
      <div class="summary-value" style="color: #1e40af;">$${Number(scenario.totalCost || scenario.cashDueAtSigning).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p>This document is for informational purposes only and does not constitute a binding contract.</p>
  </div>
</body>
</html>
      `;

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="deal-${deal.dealNumber || deal.id}.pdf"`);
      res.send(Buffer.from(pdf));
    } catch (error: any) {
      console.error('[POST /api/deals/:id/pdf] Error:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to generate PDF' });
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
        dealType: z.enum(['RETAIL', 'LEASE']).optional(),
        registrationState: z.string().length(2).optional(),
        // Lease-specific fields
        grossCapCost: z.number().min(0).optional(),
        capReductionCash: z.number().min(0).optional(),
        basePayment: z.number().min(0).optional(),
        paymentCount: z.number().int().min(1).optional(),
        // Reciprocity / Prior Tax Paid
        originTaxState: z.string().length(2).optional(),
        originTaxAmount: z.number().min(0).optional(),
        originTaxPaidDate: z.string().optional(), // ISO date string
      });

      const options = taxCalculationSchema.parse(req.body);

      // Use the AutoTaxEngine for accurate calculations
      const { calculateTax, getRulesForState } = await import('../shared/autoTaxEngine');
      const { STATE_TAX_DATA, getLocalTaxRate } = await import('../shared/tax-data');

      // Get state rules from autoTaxEngine
      const rules = getRulesForState(options.stateCode);
      if (!rules) {
        return res.status(400).json({ error: `Invalid state code: ${options.stateCode}` });
      }

      // Determine local tax rate
      let localTaxRate = 0;
      if (options.zipCode) {
        const localTax = getLocalTaxRate(options.zipCode);
        if (localTax) {
          localTaxRate = localTax.localTaxRate;
        }
      }

      // Build tax calculation input for autoTaxEngine
      const taxInput = {
        stateCode: options.stateCode,
        asOfDate: new Date().toISOString(),
        dealType: options.dealType ?? 'RETAIL',
        registrationStateCode: options.registrationState ?? options.stateCode,

        // Reciprocity info
        originTaxInfo: options.originTaxState && options.originTaxAmount
          ? {
              stateCode: options.originTaxState,
              amount: options.originTaxAmount,
              taxPaidDate: options.originTaxPaidDate,
            }
          : undefined,

        // Financial fields
        vehiclePrice: options.vehiclePrice,
        accessoriesAmount: options.accessoriesAmount ?? 0,
        tradeInValue: options.tradeValue ?? 0,
        rebateManufacturer: options.rebates ?? 0,
        rebateDealer: options.dealerDiscount ?? 0,
        docFee: options.docFee ?? 0,
        otherFees: [],
        serviceContracts: options.warrantyAmount ?? 0,
        gap: options.gapInsurance ?? 0,
        negativeEquity: options.tradePayoff && options.tradeValue
          ? Math.max(0, options.tradePayoff - options.tradeValue)
          : 0,
        taxAlreadyCollected: 0,

        // Tax rates - build from state + local
        rates: [
          { label: 'STATE', rate: rules.extras?.stateAutomotiveSalesRate ?? 0.07 },
          ...(localTaxRate > 0 ? [{ label: 'LOCAL', rate: localTaxRate }] : [])
        ],

        // Lease fields if applicable
        ...(options.dealType === 'LEASE' && {
          grossCapCost: options.grossCapCost ?? options.vehiclePrice,
          capReductionCash: options.capReductionCash ?? 0,
          capReductionTradeIn: options.tradeValue ?? 0,
          capReductionRebateManufacturer: options.rebates ?? 0,
          capReductionRebateDealer: options.dealerDiscount ?? 0,
          basePayment: options.basePayment ?? 0,
          paymentCount: options.paymentCount ?? 36,
        }),
      };

      // Calculate tax using autoTaxEngine
      const result = calculateTax(taxInput as any, rules);

      // Extract values from the new result structure
      const totalTax = result.taxes?.totalTax ?? 0;
      const taxableBase = (result.bases as any)?.taxableBase ?? 0;
      const effectiveRate = totalTax / (taxableBase || 1);

      // Audit log (basic console logging for now)
      console.log('[TAX-CALC]', {
        timestamp: new Date().toISOString(),
        stateCode: options.stateCode,
        dealType: (taxInput as any).dealType,
        vehiclePrice: options.vehiclePrice,
        totalTax: totalTax,
        user: (req as any).user?.username ?? 'anonymous',
      });

      // Get legacy state tax data for fees
      const stateTax = STATE_TAX_DATA[options.stateCode];
      const titleFee = stateTax?.titleFee ?? 0;
      const registrationFee = stateTax?.registrationFeeBase ?? 0;

      // Format response to match legacy API
      res.json({
        taxableAmount: taxableBase,
        stateTax: totalTax, // Simplified - full breakdown in engineResult
        stateTaxRate: effectiveRate,
        localTax: 0, // TODO: Extract from componentTaxes
        localTaxRate: localTaxRate,
        totalTax: totalTax,
        effectiveTaxRate: effectiveRate,
        titleFee,
        registrationFee,
        totalFees: titleFee + registrationFee,
        totalTaxAndFees: totalTax + titleFee + registrationFee,
        tradeInTaxSavings: 0, // TODO: Calculate from bases
        notes: (result.debug as any)?.notes ?? [],
        warnings: (result.debug as any)?.warnings ?? [],
        // Include full engine result for advanced clients
        engineResult: result,
      });
    } catch (error: any) {
      console.error('[TAX-CALC-ERROR]', {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
      });
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

  // ===== CREDIT SIMULATION API ENDPOINTS =====
  
  // POST /api/credit/simulate - Simulate credit score based on factors
  app.post('/api/credit/simulate', async (req, res) => {
    try {
      const { calculateCreditScore } = await import('../client/src/lib/credit-simulator');
      
      const simulationSchema = z.object({
        currentScore: z.number().min(300).max(850).optional(),
        paymentHistory: z.object({
          onTimePayments: z.number().optional(),
          totalPayments: z.number().optional(),
          delinquencies30Days: z.number().optional(),
          delinquencies60Days: z.number().optional(),
          delinquencies90Days: z.number().optional(),
          collections: z.number().optional(),
          bankruptcies: z.number().optional(),
        }).optional(),
        creditUtilization: z.object({
          totalBalance: z.number().optional(),
          totalLimit: z.number().optional(),
          utilizationRatio: z.number().optional(),
        }).optional(),
        creditHistory: z.object({
          averageAccountAge: z.number().optional(),
          oldestAccountAge: z.number().optional(),
        }).optional(),
        creditMix: z.object({
          creditCards: z.number().optional(),
          autoLoans: z.number().optional(),
          mortgages: z.number().optional(),
          studentLoans: z.number().optional(),
          otherLoans: z.number().optional(),
          totalAccounts: z.number().optional(),
        }).optional(),
        newCredit: z.object({
          hardInquiries: z.number().optional(),
          newAccounts: z.number().optional(),
          inquiriesLast6Months: z.number().optional(),
        }).optional(),
      });
      
      const input = simulationSchema.parse(req.body);
      const result = calculateCreditScore(input);
      
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid simulation data', details: error.errors });
      } else {
        res.status(500).json({ error: error.message || 'Failed to simulate credit score' });
      }
    }
  });
  
  // POST /api/credit/prequalify - Pre-qualification check
  app.post('/api/credit/prequalify', async (req, res) => {
    try {
      const { calculatePreQualification } = await import('../client/src/lib/credit-simulator');
      
      const preQualSchema = z.object({
        creditScore: z.number().min(300).max(850),
        annualIncome: z.number().min(0),
        monthlyDebtPayments: z.number().min(0),
        employmentStatus: z.enum(['Employed', 'Self-Employed', 'Retired', 'Other']),
        employmentDuration: z.number().min(0),
        housingPayment: z.number().min(0),
        downPayment: z.number().min(0),
        requestedLoanAmount: z.number().min(0),
        vehiclePrice: z.number().min(0),
      });
      
      const input = preQualSchema.parse(req.body);
      const result = calculatePreQualification(input);
      
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid pre-qualification data', details: error.errors });
      } else {
        res.status(500).json({ error: error.message || 'Failed to process pre-qualification' });
      }
    }
  });
  
  // GET /api/credit/factors - Get credit factor definitions
  app.get('/api/credit/factors', async (req, res) => {
    try {
      res.json({
        factors: {
          paymentHistory: {
            weight: 0.35,
            description: 'Your track record of paying bills on time',
            components: [
              'On-time payments',
              'Late payments (30/60/90+ days)',
              'Collections',
              'Bankruptcies',
              'Public records',
            ],
            tips: [
              'Always pay at least the minimum by the due date',
              'Set up automatic payments to avoid missed payments',
              'Contact creditors if you cannot make a payment',
            ],
          },
          creditUtilization: {
            weight: 0.30,
            description: 'How much of your available credit you use',
            components: [
              'Total balance vs. total credit limit',
              'Individual card utilization',
              'Number of cards with balances',
            ],
            tips: [
              'Keep utilization below 30% (ideally below 10%)',
              'Pay down high-balance cards first',
              'Request credit limit increases on existing cards',
              'Don\'t close old cards - it reduces available credit',
            ],
          },
          creditHistory: {
            weight: 0.15,
            description: 'The length of your credit history',
            components: [
              'Age of oldest account',
              'Average age of all accounts',
              'Age of specific account types',
            ],
            tips: [
              'Keep old accounts open even if unused',
              'Become an authorized user on older accounts',
              'Start building credit early with secured cards',
            ],
          },
          creditMix: {
            weight: 0.10,
            description: 'Variety of credit account types',
            components: [
              'Credit cards (revolving credit)',
              'Auto loans',
              'Mortgages',
              'Student loans',
              'Personal loans',
            ],
            tips: [
              'Maintain a healthy mix of credit types',
              'Don\'t open new accounts just for mix',
              'Focus on managing existing accounts well',
            ],
          },
          newCredit: {
            weight: 0.10,
            description: 'Recent credit inquiries and new accounts',
            components: [
              'Hard inquiries in last 12 months',
              'New accounts opened recently',
              'Rate shopping for same loan type',
            ],
            tips: [
              'Limit applications for new credit',
              'Rate shop within 14-45 day window',
              'Only apply for credit when needed',
              'Space out credit applications over time',
            ],
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get credit factors' });
    }
  });
  
  // GET /api/credit/recommendations/:score - Get improvement recommendations
  app.get('/api/credit/recommendations/:score', async (req, res) => {
    try {
      const { getCreditEducation } = await import('../client/src/lib/credit-simulator');
      const score = parseInt(req.params.score);
      
      if (isNaN(score) || score < 300 || score > 850) {
        return res.status(400).json({ error: 'Invalid credit score' });
      }
      
      const education = getCreditEducation(score);
      
      res.json({
        score,
        ...education,
        quickActions: [
          {
            title: 'Check for errors',
            description: 'Review your credit report for mistakes and dispute any errors',
            timeframe: '1-2 months',
            impact: 'Varies',
          },
          {
            title: 'Pay down credit cards',
            description: 'Focus on cards with highest utilization first',
            timeframe: '1-3 months',
            impact: '10-40 points',
          },
          {
            title: 'Become an authorized user',
            description: 'Get added to a family member\'s account with good payment history',
            timeframe: '1-2 months',
            impact: '10-30 points',
          },
          {
            title: 'Set up autopay',
            description: 'Ensure all bills are paid on time going forward',
            timeframe: 'Immediate',
            impact: 'Prevents negative marks',
          },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get recommendations' });
    }
  });
  
  // POST /api/credit/scenario - Simulate what-if scenarios
  app.post('/api/credit/scenario', async (req, res) => {
    try {
      const { simulateScenario } = await import('../client/src/lib/credit-simulator');
      
      const scenarioSchema = z.object({
        currentFactors: z.any(), // Using the full CreditFactors type from the service
        scenario: z.enum([
          'payoff-cards',
          'authorized-user',
          'dispute-collections',
          'wait-6-months',
          'pay-down-50',
        ]),
      });
      
      const { currentFactors, scenario } = scenarioSchema.parse(req.body);
      const result = simulateScenario(currentFactors, scenario);
      
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid scenario data', details: error.errors });
      } else {
        res.status(500).json({ error: error.message || 'Failed to simulate scenario' });
      }
    }
  });

  // ===== ANALYTICS API ENDPOINTS =====
  
  // Deterministic pseudo-random number generator based on seed
  function deterministicRandom(seed: string, index: number): number {
    // Simple hash function to create a deterministic value
    let hash = 0;
    const str = `${seed}-${index}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    // Normalize to 0-1 range
    return Math.abs(hash) / 2147483647;
  }
  
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
    
    // Sales team members with performance characteristics
    const salesTeam = [
      { id: '1', name: 'Alex Johnson', role: 'Senior Sales', avatar: '/api/placeholder/40/40', performanceIndex: 0.95 },
      { id: '2', name: 'Sarah Williams', role: 'Sales Manager', avatar: '/api/placeholder/40/40', performanceIndex: 0.90 },
      { id: '3', name: 'Mike Chen', role: 'Sales Associate', avatar: '/api/placeholder/40/40', performanceIndex: 0.75 },
      { id: '4', name: 'Emily Davis', role: 'Finance Manager', avatar: '/api/placeholder/40/40', performanceIndex: 0.85 },
      { id: '5', name: 'James Wilson', role: 'Sales Associate', avatar: '/api/placeholder/40/40', performanceIndex: 0.70 },
      { id: '6', name: 'Lisa Brown', role: 'Internet Sales', avatar: '/api/placeholder/40/40', performanceIndex: 0.80 },
    ];
    
    // Generate realistic deal data with seasonal variation
    const generateDealData = (date: Date) => {
      const month = date.getMonth();
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const dateStr = date.toISOString().split('T')[0];
      
      // Seasonal multipliers (higher in spring/summer)
      const seasonalMultiplier = 1 + (Math.sin((month - 3) * Math.PI / 6) * 0.3);
      
      // Weekend boost
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.4 : 1;
      
      // End of month push
      const endOfMonthMultiplier = dayOfMonth > 25 ? 1.3 : 1;
      
      // Base deals per day with deterministic variation
      const baseDeals = 8;
      const dailyVariation = deterministicRandom(dateStr, 0) * 4 - 2;
      const dealsCount = Math.round(
        baseDeals * seasonalMultiplier * weekendMultiplier * endOfMonthMultiplier + dailyVariation
      );
      
      const deals = [];
      for (let i = 0; i < dealsCount; i++) {
        const dealSeed = `${dateStr}-deal-${i}`;
        
        // Assign salesperson based on weighted performance
        const salesIndex = Math.floor(deterministicRandom(dealSeed, 1) * salesTeam.length);
        const salesperson = salesTeam[salesIndex];
        
        // Vehicle and deal characteristics
        const isNew = deterministicRandom(dealSeed, 2) > 0.4;
        const isLease = deterministicRandom(dealSeed, 3) > 0.7;
        const hasTradeIn = deterministicRandom(dealSeed, 4) > 0.5;
        const financeType = deterministicRandom(dealSeed, 5) > 0.3 ? 'finance' : 'cash';
        
        // Pricing based on vehicle type with deterministic variation
        const priceRandom = deterministicRandom(dealSeed, 6);
        const basePrice = isNew 
          ? 35000 + priceRandom * 40000 
          : 15000 + priceRandom * 30000;
          
        // Down payment for financed deals
        const downPaymentRatio = financeType === 'finance' 
          ? 0.1 + deterministicRandom(dealSeed, 7) * 0.15 
          : 0;
        const downPayment = basePrice * downPaymentRatio;
        
        // Trade-in value
        const tradeValue = hasTradeIn 
          ? 5000 + deterministicRandom(dealSeed, 8) * 20000 
          : 0;
          
        // Gross profit influenced by salesperson performance
        const profitMargin = 0.08 + (deterministicRandom(dealSeed, 9) * 0.07 * salesperson.performanceIndex);
        const grossProfit = basePrice * profitMargin;
        
        // F&I products revenue for financed deals
        const fiRevenue = financeType === 'finance' 
          ? 800 + deterministicRandom(dealSeed, 10) * 2000 * salesperson.performanceIndex
          : 0;
          
        // APR based on credit tier
        const creditRandom = deterministicRandom(dealSeed, 11);
        const creditScore = 580 + Math.floor(creditRandom * 270);
        const aprBase = creditScore > 720 ? 3.9 : creditScore > 650 ? 5.9 : 7.9;
        const apr = financeType === 'finance' 
          ? aprBase + deterministicRandom(dealSeed, 12) * 4 
          : 0;
          
        // Term selection
        const termOptions = isLease ? [36] : [48, 60, 72];
        const termIndex = Math.floor(deterministicRandom(dealSeed, 13) * termOptions.length);
        const term = financeType === 'finance' ? termOptions[termIndex] : 0;
        
        // Response time influenced by salesperson performance  
        const responseTime = 5 + Math.floor(deterministicRandom(dealSeed, 14) * 120 / salesperson.performanceIndex);
        
        // Deal completion influenced by salesperson performance
        const completionThreshold = 0.15 - (salesperson.performanceIndex - 0.7) * 0.1;
        const status = deterministicRandom(dealSeed, 15) > completionThreshold ? 'completed' : 'cancelled';
        
        deals.push({
          date: date.toISOString(),
          salespersonId: salesperson.id,
          salesperson: salesperson.name,
          vehicleType: isNew ? 'new' : 'used',
          dealType: isLease ? 'lease' : 'purchase',
          financeType,
          vehiclePrice: Math.round(basePrice),
          downPayment: Math.round(downPayment),
          tradeInValue: Math.round(tradeValue),
          grossProfit: Math.round(grossProfit),
          hasTradeIn,
          fiProductsRevenue: Math.round(fiRevenue),
          apr: Math.round(apr * 100) / 100,
          term,
          creditScore,
          responseTimeMinutes: responseTime,
          status,
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
    const inventory = makes.flatMap((make, makeIndex) => {
      const makeSeed = `inventory-${make}`;
      const modelCount = 3 + Math.floor(deterministicRandom(makeSeed, 0) * 5);
      
      // Popular makes have better turnover rates
      const popularityFactor = ['Toyota', 'Honda', 'Ford'].includes(make) ? 1.2 : 1.0;
      const luxuryFactor = ['BMW', 'Mercedes-Benz', 'Audi'].includes(make) ? 0.8 : 1.0; // Luxury cars move slower
      
      return Array(modelCount).fill(0).map((_, modelIndex) => {
        const modelSeed = `${makeSeed}-model-${modelIndex}`;
        
        // Base inventory count influenced by popularity
        const baseCount = 5 + deterministicRandom(modelSeed, 1) * 15;
        const count = Math.floor(baseCount * popularityFactor);
        
        // Days on lot influenced by luxury factor
        const baseDaysOnLot = 15 + deterministicRandom(modelSeed, 2) * 45;
        const avgDaysOnLot = Math.floor(baseDaysOnLot * luxuryFactor);
        
        // Turnover rate inversely related to days on lot
        const baseTurnoverRate = 0.3 + deterministicRandom(modelSeed, 3) * 0.4;
        const turnoverRate = baseTurnoverRate * popularityFactor / luxuryFactor;
        
        return {
          make,
          model: `Model ${String.fromCharCode(65 + modelIndex)}`,
          count,
          avgDaysOnLot,
          turnoverRate: Math.round(turnoverRate * 1000) / 1000,
        };
      });
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
      
      // Generate sparkline data for last 30 days
      const sparklineDays = 30;
      const sparklineEnd = new Date(now);
      const sparklineStart = new Date(now);
      sparklineStart.setDate(sparklineEnd.getDate() - sparklineDays);
      
      const sparklineData: { [key: string]: Array<{ value: number }> } = {
        revenue: [],
        deals: [],
        conversionRate: [],
        avgDealValue: [],
      };
      
      // Generate daily sparkline values
      for (let i = 0; i < sparklineDays; i++) {
        const dayDate = new Date(sparklineStart);
        dayDate.setDate(sparklineStart.getDate() + i);
        
        const dayDeals = deals.filter(d => {
          const dealDate = new Date(d.date);
          return dealDate.toDateString() === dayDate.toDateString() && d.status === 'completed';
        });
        
        const dayRevenue = dayDeals.reduce((sum, d) => sum + d.vehiclePrice, 0);
        const dayAvgDealValue = dayDeals.length > 0 ? dayRevenue / dayDeals.length : 0;
        const allDayDeals = deals.filter(d => {
          const dealDate = new Date(d.date);
          return dealDate.toDateString() === dayDate.toDateString();
        });
        const dayConversion = allDayDeals.length > 0 
          ? (dayDeals.length / allDayDeals.length) * 100 
          : 0;
        
        sparklineData.revenue.push({ value: dayRevenue });
        sparklineData.deals.push({ value: dayDeals.length });
        sparklineData.conversionRate.push({ value: dayConversion });
        sparklineData.avgDealValue.push({ value: dayAvgDealValue });
      }
      
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
        sparklineData, // Include historical sparkline data
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
        currentUtilization: 87 + deterministicRandom('inventory-utilization', 0) * 10,
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
          conversionRate: 75 + (member.performanceIndex - 0.7) * 50, // Performance-based conversion rate
          avgResponseTime: Math.round(avgResponseTime),
          customerSatisfaction: 4.2 + member.performanceIndex * 0.7, // Performance-based satisfaction
          fiAttachmentRate: memberDeals.filter(d => d.financeType === 'finance' && d.fiProductsRevenue > 0).length /
                          Math.max(memberDeals.filter(d => d.financeType === 'finance').length, 1) * 100,
        };
      }).sort((a, b) => b.revenue - a.revenue);
      
      // Activity metrics - based on performance index and deals
      const activities = {
        calls: performance.map((p, idx) => ({ 
          name: p.name, 
          count: Math.floor(50 + deterministicRandom(`activity-calls-${p.id}`, idx) * 100 * p.conversionRate / 100) 
        })),
        emails: performance.map((p, idx) => ({ 
          name: p.name, 
          count: Math.floor(30 + deterministicRandom(`activity-emails-${p.id}`, idx) * 70 * p.conversionRate / 100) 
        })),
        appointments: performance.map((p, idx) => ({ 
          name: p.name, 
          count: Math.floor(10 + deterministicRandom(`activity-appt-${p.id}`, idx) * 30 * p.conversionRate / 100) 
        })),
        testDrives: performance.map((p, idx) => ({ 
          name: p.name, 
          count: Math.floor(5 + deterministicRandom(`activity-test-${p.id}`, idx) * 20 * p.conversionRate / 100) 
        })),
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
        // Most improved: middle performer with good recent performance
        mostImproved: performance[Math.floor(performance.length / 2)] || performance[0],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get team performance data' });
    }
  });
  
  // ===== LENDER ENDPOINTS =====
  
  // GET /api/lenders - List all available lenders
  app.get('/api/lenders', async (req, res) => {
    try {
      const { active } = req.query;
      const lenders = await storage.getLenders(active === 'true' ? true : active === 'false' ? false : undefined);
      res.json(lenders);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get lenders' });
    }
  });
  
  // GET /api/lenders/:id - Get specific lender
  app.get('/api/lenders/:id', async (req, res) => {
    try {
      const lender = await storage.getLender(req.params.id);
      if (!lender) {
        return res.status(404).json({ error: 'Lender not found' });
      }
      res.json(lender);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get lender' });
    }
  });
  
  // GET /api/lenders/:id/programs - Get lender's programs
  app.get('/api/lenders/:id/programs', async (req, res) => {
    try {
      const { active } = req.query;
      const programs = await storage.getLenderPrograms(
        req.params.id,
        active === 'true' ? true : active === 'false' ? false : undefined
      );
      res.json(programs);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get lender programs' });
    }
  });
  
  // POST /api/lenders/shop - Get rates from all lenders
  app.post('/api/lenders/shop', async (req, res) => {
    try {
      const shopRatesSchema = z.object({
        dealId: z.string().uuid(),
        scenarioId: z.string().uuid().optional(),
        creditScore: z.number().min(300).max(850),
        cobuyerCreditScore: z.number().min(300).max(850).optional(),
        vehiclePrice: z.number().positive(),
        requestedAmount: z.number().positive(),
        downPayment: z.number().min(0),
        tradeValue: z.number().min(0).default(0),
        tradePayoff: z.number().min(0).default(0),
        requestedTerm: z.number().min(12).max(84),
        vehicleType: z.enum(['new', 'used', 'certified']).default('used'),
        vehicleYear: z.number().optional(),
        vehicleMileage: z.number().optional(),
        monthlyIncome: z.number().positive().optional(),
        monthlyDebt: z.number().min(0).optional(),
        state: z.string().length(2).default('CA'),
        requestType: z.enum(['soft_pull', 'hard_pull', 'manual']).default('soft_pull'),
      });
      
      const data = shopRatesSchema.parse(req.body);
      
      // Get the deal to verify it exists
      const deal = await storage.getDeal(data.dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      // Create rate request record
      const rateRequest = await storage.createRateRequest({
        dealId: data.dealId,
        scenarioId: data.scenarioId || null,
        creditScore: data.creditScore,
        cobuyerCreditScore: data.cobuyerCreditScore || null,
        requestedAmount: data.requestedAmount.toFixed(2),
        downPayment: data.downPayment.toFixed(2),
        tradeValue: data.tradeValue.toFixed(2),
        tradePayoff: data.tradePayoff.toFixed(2),
        term: data.requestedTerm,
        monthlyIncome: data.monthlyIncome?.toFixed(2) || null,
        monthlyDebt: data.monthlyDebt?.toFixed(2) || null,
        calculatedDti: data.monthlyIncome && data.monthlyDebt
          ? ((data.monthlyDebt / data.monthlyIncome) * 100).toFixed(2)
          : null,
        vehicleData: {
          price: data.vehiclePrice,
          type: data.vehicleType,
          year: data.vehicleYear,
          mileage: data.vehicleMileage,
        },
        requestType: data.requestType,
        requestData: data,
        responseData: {},
        responseCount: 0,
        status: 'processing',
        errorMessage: null,
        createdBy: deal.salespersonId,
      });
      
      try {
        // In a real system, this would call actual lender APIs
        // For now, we use our mock service with realistic data
        const { shopRates: mockShopRates } = await import('../client/src/lib/lender-service');
        
        const loanAmount = data.vehiclePrice - data.downPayment - (data.tradeValue - data.tradePayoff);
        
        const approvedOffers = await mockShopRates(
          data.creditScore,
          loanAmount,
          data.vehiclePrice,
          data.downPayment,
          data.tradeValue,
          data.tradePayoff,
          data.requestedTerm,
          data.vehicleType === 'new' ? 'new' : 'used',
          data.monthlyIncome,
          data.monthlyDebt,
          data.state
        );
        
        // Save approved lenders to database
        if (approvedOffers.length > 0) {
          const approvedLendersData = approvedOffers.map((offer: any) => ({
            rateRequestId: rateRequest.id,
            lenderId: offer.lenderId,
            programId: offer.programId || null,
            approvalStatus: offer.approvalStatus,
            approvalAmount: offer.approvalAmount,
            apr: offer.apr,
            buyRate: offer.buyRate,
            dealerReserve: offer.dealerReserve,
            flatFee: offer.flatFee,
            term: offer.term,
            monthlyPayment: offer.monthlyPayment,
            totalFinanceCharge: offer.totalFinanceCharge,
            totalOfPayments: offer.totalOfPayments,
            ltv: offer.ltv,
            dti: offer.dti,
            pti: offer.pti,
            stipulations: offer.stipulations,
            specialConditions: offer.specialConditions,
            approvalScore: offer.approvalScore,
            approvalLikelihood: offer.approvalLikelihood,
            incentives: offer.incentives,
            specialRate: offer.specialRate,
            selected: false,
            selectedAt: null,
            selectedBy: null,
            offerExpiresAt: offer.offerExpiresAt,
          }));
          
          await storage.createApprovedLenders(approvedLendersData);
        }
        
        // Update rate request with response
        await storage.updateRateRequest(rateRequest.id, {
          responseData: { offers: approvedOffers },
          responseCount: approvedOffers.length,
          status: 'completed',
          respondedAt: new Date(),
        });
        
        // Return the offers with additional metadata
        res.json({
          rateRequestId: rateRequest.id,
          requestedAt: rateRequest.requestedAt,
          offerCount: approvedOffers.length,
          offers: approvedOffers,
          bestRate: approvedOffers[0] || null,
          averageRate: approvedOffers.length > 0
            ? (approvedOffers.reduce((sum: number, o: any) => sum + parseFloat(o.apr), 0) / approvedOffers.length).toFixed(3)
            : null,
        });
        
      } catch (shopError: any) {
        // Update rate request with error
        await storage.updateRateRequest(rateRequest.id, {
          status: 'failed',
          errorMessage: shopError.message || 'Failed to shop rates',
          respondedAt: new Date(),
        });
        throw shopError;
      }
      
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to shop rates' });
    }
  });
  
  // GET /api/lenders/rates/:rateRequestId - Get saved rate request and offers
  app.get('/api/lenders/rates/:rateRequestId', async (req, res) => {
    try {
      const rateRequest = await storage.getRateRequest(req.params.rateRequestId);
      if (!rateRequest) {
        return res.status(404).json({ error: 'Rate request not found' });
      }
      
      const offers = await storage.getApprovedLenders(req.params.rateRequestId);
      
      res.json({
        rateRequest,
        offers,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get rate request' });
    }
  });
  
  // POST /api/lenders/select - Select a lender offer
  app.post('/api/lenders/select', async (req, res) => {
    try {
      const selectLenderSchema = z.object({
        approvedLenderId: z.string().uuid(),
        userId: z.string().uuid(),
      });
      
      const { approvedLenderId, userId } = selectLenderSchema.parse(req.body);
      
      const selected = await storage.selectApprovedLender(approvedLenderId, userId);
      
      res.json(selected);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to select lender' });
    }
  });
  
  // POST /api/lenders/submit - Submit application (placeholder)
  app.post('/api/lenders/submit', async (req, res) => {
    try {
      const submitApplicationSchema = z.object({
        approvedLenderId: z.string().uuid(),
        dealId: z.string().uuid(),
        applicantInfo: z.object({
          ssn: z.string().optional(),
          employerName: z.string().optional(),
          employmentYears: z.number().optional(),
          housingPayment: z.number().optional(),
          references: z.array(z.object({
            name: z.string(),
            phone: z.string(),
            relationship: z.string(),
          })).optional(),
        }).optional(),
      });
      
      const data = submitApplicationSchema.parse(req.body);
      
      // In a real system, this would submit to the lender's API
      // For now, we just return a success message
      res.json({
        success: true,
        message: 'Application submitted successfully (placeholder)',
        applicationId: `APP-${Date.now()}`,
        status: 'pending_review',
        estimatedResponseTime: '15-30 minutes',
      });
      
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to submit application' });
    }
  });
  
  // GET /api/deals/:id/lenders - Get lender history for a deal
  app.get('/api/deals/:id/lenders', async (req, res) => {
    try {
      const rateRequests = await storage.getRateRequestsByDeal(req.params.id);
      const selected = await storage.getSelectedLenderForDeal(req.params.id);
      
      res.json({
        rateRequests,
        selectedLender: selected || null,
        totalRequests: rateRequests.length,
        lastRequestedAt: rateRequests[0]?.requestedAt || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get deal lender history' });
    }
  });

  // ===== AI CHAT =====
  
  // POST /api/ai/chat - Handle chat messages with streaming
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const chatRequestSchema = z.object({
        message: z.string().min(1),
        conversationHistory: z.array(z.object({
          id: z.string(),
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string(),
          timestamp: z.string().transform(str => new Date(str)),
          metadata: z.object({
            dealId: z.string().optional(),
            scenarioId: z.string().optional(),
            suggestions: z.array(z.string()).optional()
          }).optional()
        })).default([]),
        context: z.object({
          scenario: z.any().optional(),
          vehicle: z.any().optional(),
          tradeVehicle: z.any().optional(),
          calculations: z.object({
            monthlyPayment: z.string(),
            totalCost: z.string(),
            amountFinanced: z.string(),
            tradeEquity: z.string(),
            totalTax: z.string(),
            totalFees: z.string()
          }).optional()
        }).optional()
      });
      
      const { message, conversationHistory, context } = chatRequestSchema.parse(req.body);
      
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable Nginx buffering
      });
      
      // Send initial connection event
      res.write('event: connected\n');
      res.write('data: {"type":"connected"}\n\n');
      
      // Handle streaming response
      const chunks: string[] = [];
      const response = await aiService.sendMessage(
        message,
        conversationHistory as ChatMessage[],
        context as DealContext,
        (chunk: string) => {
          chunks.push(chunk);
          // Send chunk as SSE event
          const data = JSON.stringify({ type: 'chunk', content: chunk });
          res.write(`data: ${data}\n\n`);
        }
      );
      
      // Send complete message
      const completeData = JSON.stringify({
        type: 'complete',
        message: response
      });
      res.write(`data: ${completeData}\n\n`);
      
      // Close the connection
      res.write('event: done\n');
      res.write('data: {"type":"done"}\n\n');
      res.end();
      
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      
      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to process chat request',
          message: error.message 
        });
      } else {
        // If we're already streaming, send error event
        const errorData = JSON.stringify({
          type: 'error',
          error: 'Failed to process request'
        });
        res.write(`data: ${errorData}\n\n`);
        res.end();
      }
    }
  });
  
  // GET /api/ai/suggestions - Get suggested questions based on context
  app.post('/api/ai/suggestions', async (req, res) => {
    try {
      const suggestionsRequestSchema = z.object({
        context: z.object({
          scenario: z.any().optional(),
          vehicle: z.any().optional(),
          tradeVehicle: z.any().optional(),
          calculations: z.object({
            monthlyPayment: z.string(),
            totalCost: z.string(),
            amountFinanced: z.string(),
            tradeEquity: z.string(),
            totalTax: z.string(),
            totalFees: z.string()
          }).optional()
        }).optional()
      });
      
      const { context } = suggestionsRequestSchema.parse(req.body);
      const suggestions = aiService.getSuggestedQuestions(context as DealContext);
      
      res.json({ suggestions });
      
    } catch (error: any) {
      res.status(400).json({ 
        error: 'Failed to get suggestions',
        message: error.message 
      });
    }
  });

  // ===== ML OPTIMIZATION =====

  // Import ML services
  const { dealAnalyzer } = await import('./services/deal-analyzer');
  const { primeEngine } = await import('./ml/prime-engine');

  // POST /api/ml/analyze - Analyze deal with local AI + ML recommendations
  app.post('/api/ml/analyze', requireAuth, async (req, res) => {
    try {
      const analyzeRequestSchema = z.object({
        vehiclePrice: z.number().positive(),
        downPayment: z.number().nonnegative().optional(),
        tradeValue: z.number().nonnegative().optional(),
        tradePayoff: z.number().nonnegative().optional(),
        termMonths: z.number().int().positive().optional(),
        interestRate: z.number().nonnegative().optional(),
        zipCode: z.string().min(5).max(10),
        customerFico: z.number().int().min(300).max(850).optional(),
        customerMonthlyIncome: z.number().positive().optional(),
      });

      const request = analyzeRequestSchema.parse(req.body);

      // Get rule-based analysis from local AI agent
      const analysis = await dealAnalyzer.analyzeDeal(request);

      // Get ML-optimized strategy recommendation from Prime Engine
      const mlRecommendation = primeEngine.getRecommendation({
        vehiclePrice: request.vehiclePrice,
        downPayment: request.downPayment || 0,
        termMonths: request.termMonths || 60,
        tradeValue: request.tradeValue,
        customerFico: request.customerFico,
        loanToValue: analysis.dealMetrics.loanToValue,
      });

      res.json({
        analysis,
        mlOptimization: mlRecommendation,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('ML Analysis Error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to analyze deal',
        message: error.message,
      });
    }
  });

  // POST /api/ml/feedback - Record deal outcome to train ML engine
  app.post('/api/ml/feedback', requireAuth, async (req, res) => {
    try {
      const feedbackSchema = z.object({
        dealId: z.string().uuid(),
        strategyKey: z.string(),
        success: z.boolean(),
        metadata: z.object({
          closeDate: z.string().optional(),
          finalPayment: z.number().optional(),
          customerSatisfaction: z.number().min(1).max(5).optional(),
        }).optional(),
      });

      const feedback = feedbackSchema.parse(req.body);

      // Record outcome in Prime Engine (this is how it learns!)
      primeEngine.recordOutcome(feedback.strategyKey, feedback.success);

      console.log(
        `[ML Feedback] Deal ${feedback.dealId} using strategy "${feedback.strategyKey}": ` +
        `${feedback.success ? 'SUCCESS' : 'FAILURE'}`
      );

      res.json({
        status: 'recorded',
        strategyKey: feedback.strategyKey,
        success: feedback.success,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('ML Feedback Error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid feedback data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to record feedback',
        message: error.message,
      });
    }
  });

  // GET /api/ml/performance - Get ML engine performance metrics
  app.get('/api/ml/performance', requireAuth, async (req, res) => {
    try {
      const report = primeEngine.getPerformanceReport();

      res.json({
        ...report,
        message: 'ML engine performance metrics',
      });

    } catch (error: any) {
      console.error('ML Performance Error:', error);
      res.status(500).json({
        error: 'Failed to get performance metrics',
        message: error.message,
      });
    }
  });

  // POST /api/ml/reset - Reset ML statistics (admin only, for testing)
  app.post('/api/ml/reset', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      primeEngine.resetStatistics();

      res.json({
        status: 'reset',
        message: 'ML engine statistics have been reset',
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('ML Reset Error:', error);
      res.status(500).json({
        error: 'Failed to reset ML engine',
        message: error.message,
      });
    }
  });

  // ===== INTELLIGENCE (WHACO + OSCILLATOR COORDINATION) =====

  // Import intelligence service
  const { intelligenceService } = await import('./services/intelligence-service');

  // POST /api/intelligence/analyze-customer - Analyze customer with WHACO + assign salesperson
  app.post('/api/intelligence/analyze-customer', requireAuth, async (req, res) => {
    try {
      const analyzeCustomerSchema = z.object({
        customerId: z.string(),
        creditScore: z.number().int().min(300).max(850).optional(),
        annualIncome: z.number().positive().optional(),
        vehiclePrice: z.number().positive(),
        downPayment: z.number().nonnegative().optional(),
        tradeValue: z.number().nonnegative().optional(),
        visitCount: z.number().int().nonnegative().optional(),
        timeOnLot: z.number().nonnegative().optional(), // minutes
        engagement: z.number().min(0).max(1).optional(),
        coBuyer: z.boolean().optional(),
        termMonths: z.number().int().positive().optional(),
        paymentSensitivity: z.number().min(0).max(1).optional(),
      });

      const customerData = analyzeCustomerSchema.parse(req.body);

      const analysis = intelligenceService.analyzeCustomer(customerData);

      res.json({
        ...analysis,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Intelligence Analysis Error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid customer data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to analyze customer',
        message: error.message,
      });
    }
  });

  // GET /api/intelligence/team-status - Get current team coordination status
  app.get('/api/intelligence/team-status', requireAuth, async (req, res) => {
    try {
      const status = intelligenceService.getTeamStatus();

      res.json({
        ...status,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Team Status Error:', error);
      res.status(500).json({
        error: 'Failed to get team status',
        message: error.message,
      });
    }
  });

  // GET /api/intelligence/customer-segments - Get customer clustering summary
  app.get('/api/intelligence/customer-segments', requireAuth, async (req, res) => {
    try {
      const segments = intelligenceService.getCustomerSegments();

      res.json({
        segments,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Customer Segments Error:', error);
      res.status(500).json({
        error: 'Failed to get customer segments',
        message: error.message,
      });
    }
  });

  // GET /api/intelligence/anomalies - Get recent anomalous customers
  app.get('/api/intelligence/anomalies', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const anomalies = intelligenceService.getRecentAnomalies(limit);

      res.json({
        anomalies,
        total: anomalies.length,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Anomalies Error:', error);
      res.status(500).json({
        error: 'Failed to get anomalies',
        message: error.message,
      });
    }
  });

  // POST /api/intelligence/deal-closed - Record deal closed event
  app.post('/api/intelligence/deal-closed', requireAuth, async (req, res) => {
    try {
      const dealClosedSchema = z.object({
        salespersonId: z.string(),
        dealId: z.string(),
      });

      const { salespersonId, dealId } = dealClosedSchema.parse(req.body);

      intelligenceService.recordDealClosed(salespersonId);

      // Save states in background (don't wait)
      intelligenceService.saveStates().catch(err =>
        console.error('Error saving intelligence states:', err)
      );

      res.json({
        status: 'recorded',
        salespersonId,
        dealId,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Deal Closed Recording Error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to record deal closed',
        message: error.message,
      });
    }
  });

  // POST /api/intelligence/update-team - Manual trigger to update oscillator network
  app.post('/api/intelligence/update-team', requireAuth, async (req, res) => {
    try {
      intelligenceService.updateTeamState();

      res.json({
        status: 'updated',
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Team Update Error:', error);
      res.status(500).json({
        error: 'Failed to update team state',
        message: error.message,
      });
    }
  });

  // GET /api/intelligence/insights - Get comprehensive intelligence insights
  app.get('/api/intelligence/insights', requireAuth, async (req, res) => {
    try {
      const insights = intelligenceService.getTeamInsights();

      res.json({
        ...insights,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Intelligence Insights Error:', error);
      res.status(500).json({
        error: 'Failed to get intelligence insights',
        message: error.message,
      });
    }
  });

  // POST /api/intelligence/add-salesperson - Add salesperson to oscillator network
  app.post('/api/intelligence/add-salesperson', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const addSalespersonSchema = z.object({
        id: z.string(),
        name: z.string(),
        skillLevel: z.number().min(0).max(1).optional(),
        naturalFrequency: z.number().positive().optional(),
      });

      const { id, name, skillLevel, naturalFrequency } = addSalespersonSchema.parse(req.body);

      intelligenceService.addSalesperson(id, name, skillLevel, naturalFrequency);

      // Save state
      await intelligenceService.saveStates();

      res.json({
        status: 'added',
        id,
        name,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Add Salesperson Error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to add salesperson',
        message: error.message,
      });
    }
  });

  // DELETE /api/intelligence/salesperson/:id - Remove salesperson from network
  app.delete('/api/intelligence/salesperson/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;

      intelligenceService.removeSalesperson(id);

      // Save state
      await intelligenceService.saveStates();

      res.json({
        status: 'removed',
        id,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Remove Salesperson Error:', error);
      res.status(500).json({
        error: 'Failed to remove salesperson',
        message: error.message,
      });
    }
  });

  // POST /api/intelligence/reset - Reset intelligence engines (admin only)
  app.post('/api/intelligence/reset', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      intelligenceService.reset();

      res.json({
        status: 'reset',
        message: 'Intelligence engines have been reset',
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Intelligence Reset Error:', error);
      res.status(500).json({
        error: 'Failed to reset intelligence engines',
        message: error.message,
      });
    }
  });

  // ===== HIERARCHY & PERFORMANCE OPTIMIZATION =====

  // Import hierarchy services
  const { hierarchicalOscillatorNetwork } = await import('./ml/hierarchical-oscillator');
  const { UserRole, getDefaultRoleSettings, ROLE_METADATA } = await import('./ml/role-hierarchy');

  // POST /api/hierarchy/add-user - Add user to hierarchical network
  app.post('/api/hierarchy/add-user', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const addUserSchema = z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        managerId: z.string().optional(),
        settings: z.any().optional(), // Optional custom settings
      });

      const { id, name, role, managerId, settings } = addUserSchema.parse(req.body);

      // Get default settings or use provided
      const roleSettings = settings || getDefaultRoleSettings(role as any);

      hierarchicalOscillatorNetwork.addUserToNetwork(
        id,
        name,
        role as any,
        roleSettings,
        managerId
      );

      res.json({
        status: 'added',
        id,
        name,
        role,
        managerId,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Add User to Hierarchy Error:', error);
      res.status(500).json({
        error: 'Failed to add user to hierarchy',
        message: error.message,
      });
    }
  });

  // DELETE /api/hierarchy/user/:id - Remove user from network
  app.delete('/api/hierarchy/user/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;

      hierarchicalOscillatorNetwork.removeUserFromNetwork(id);

      res.json({
        status: 'removed',
        id,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Remove User from Hierarchy Error:', error);
      res.status(500).json({
        error: 'Failed to remove user from hierarchy',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/user/:id - Get user details with role and settings
  app.get('/api/hierarchy/user/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const osc = hierarchicalOscillatorNetwork.getHierarchicalOscillator(id);
      if (!osc) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: osc.id,
        name: osc.name,
        role: osc.role,
        roleLevel: osc.roleLevel,
        managerId: osc.managerId,
        subordinateIds: osc.subordinateIds,
        settings: osc.settings,
        metrics: osc.metrics,
        roleState: osc.roleState,
        phase: osc.phase,
        activeDeals: osc.activeDeals,
        skillLevel: osc.skillLevel,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get User Error:', error);
      res.status(500).json({
        error: 'Failed to get user',
        message: error.message,
      });
    }
  });

  // PATCH /api/hierarchy/user/:id/settings - Update user settings
  app.patch('/api/hierarchy/user/:id/settings', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const settingsUpdate = req.body;

      const osc = hierarchicalOscillatorNetwork.getHierarchicalOscillator(id);
      if (!osc) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Deep merge settings
      osc.settings = {
        ...osc.settings,
        ...settingsUpdate,
        performanceTargets: {
          ...osc.settings.performanceTargets,
          ...(settingsUpdate.performanceTargets || {}),
        },
        permissions: {
          ...osc.settings.permissions,
          ...(settingsUpdate.permissions || {}),
        },
        compensation: {
          ...osc.settings.compensation,
          ...(settingsUpdate.compensation || {}),
        },
        features: {
          ...osc.settings.features,
          ...(settingsUpdate.features || {}),
        },
        workflow: {
          ...osc.settings.workflow,
          ...(settingsUpdate.workflow || {}),
        },
        notifications: {
          ...osc.settings.notifications,
          ...(settingsUpdate.notifications || {}),
        },
        intelligence: {
          ...osc.settings.intelligence,
          ...(settingsUpdate.intelligence || {}),
        },
      };

      res.json({
        status: 'updated',
        id,
        settings: osc.settings,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Update User Settings Error:', error);
      res.status(500).json({
        error: 'Failed to update user settings',
        message: error.message,
      });
    }
  });

  // POST /api/hierarchy/user/:id/metrics - Update performance metrics
  app.post('/api/hierarchy/user/:id/metrics', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const metricsUpdate = req.body;

      hierarchicalOscillatorNetwork.updatePerformanceMetrics(id, metricsUpdate);

      res.json({
        status: 'updated',
        id,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Update Metrics Error:', error);
      res.status(500).json({
        error: 'Failed to update metrics',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/team/:managerId - Get team performance for a manager
  app.get('/api/hierarchy/team/:managerId', requireAuth, async (req, res) => {
    try {
      const { managerId } = req.params;

      const teamPerformance = hierarchicalOscillatorNetwork.getTeamPerformance(managerId);

      if (!teamPerformance) {
        return res.status(404).json({ error: 'Manager not found or has no team' });
      }

      res.json({
        ...teamPerformance,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get Team Performance Error:', error);
      res.status(500).json({
        error: 'Failed to get team performance',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/optimization/:userId - Get performance optimization for user
  app.get('/api/hierarchy/optimization/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;

      const optimization = hierarchicalOscillatorNetwork.getPerformanceOptimization(userId);

      if (!optimization) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        ...optimization,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get Performance Optimization Error:', error);
      res.status(500).json({
        error: 'Failed to get performance optimization',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/roles - Get all available roles and metadata
  app.get('/api/hierarchy/roles', requireAuth, async (req, res) => {
    try {
      res.json({
        roles: ROLE_METADATA,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get Roles Error:', error);
      res.status(500).json({
        error: 'Failed to get roles',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/default-settings/:role - Get default settings for a role
  app.get('/api/hierarchy/default-settings/:role', requireAuth, async (req, res) => {
    try {
      const { role } = req.params;

      const defaultSettings = getDefaultRoleSettings(role as any);

      res.json({
        role,
        settings: defaultSettings,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get Default Settings Error:', error);
      res.status(500).json({
        error: 'Failed to get default settings',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/all-users - Get all users in hierarchy
  app.get('/api/hierarchy/all-users', requireAuth, async (req, res) => {
    try {
      const allUsers = hierarchicalOscillatorNetwork.getAllHierarchicalOscillators();

      res.json({
        users: allUsers.map(osc => ({
          id: osc.id,
          name: osc.name,
          role: osc.role,
          roleLevel: osc.roleLevel,
          managerId: osc.managerId,
          subordinateCount: osc.subordinateIds.length,
          activeDeals: osc.activeDeals,
          dealsToday: osc.dealsClosedToday,
          dealsThisMonth: osc.metrics.dealsThisMonth,
          phase: osc.phase,
          skillLevel: osc.skillLevel,
        })),
        total: allUsers.length,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get All Users Error:', error);
      res.status(500).json({
        error: 'Failed to get all users',
        message: error.message,
      });
    }
  });

  // GET /api/hierarchy/analytics - Get comprehensive hierarchy analytics
  app.get('/api/hierarchy/analytics', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const allUsers = hierarchicalOscillatorNetwork.getAllHierarchicalOscillators();

      // Managers only
      const managers = allUsers.filter(osc =>
        ROLE_METADATA[osc.role].isManagement && osc.subordinateIds.length > 0
      );

      // Get team performance for each manager
      const teamPerformances = managers.map(manager =>
        hierarchicalOscillatorNetwork.getTeamPerformance(manager.id)
      ).filter(tp => tp !== null);

      // Overall statistics
      const totalDeals = allUsers.reduce((sum, osc) => sum + osc.metrics.dealsThisMonth, 0);
      const totalRevenue = allUsers.reduce((sum, osc) => sum + osc.metrics.revenueThisMonth, 0);
      const avgSatisfaction = allUsers.reduce((sum, osc) => sum + osc.metrics.avgCustomerSatisfaction, 0) / allUsers.length;

      // Role distribution
      const roleDistribution: Record<string, number> = {};
      allUsers.forEach(osc => {
        roleDistribution[osc.role] = (roleDistribution[osc.role] || 0) + 1;
      });

      res.json({
        overview: {
          totalUsers: allUsers.length,
          totalManagers: managers.length,
          totalDeals,
          totalRevenue,
          avgSatisfaction,
        },
        roleDistribution,
        teamPerformances,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Get Analytics Error:', error);
      res.status(500).json({
        error: 'Failed to get analytics',
        message: error.message,
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
