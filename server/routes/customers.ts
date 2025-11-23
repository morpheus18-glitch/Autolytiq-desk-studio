import { Router, Request } from "express";
import { storage } from "../storage";
import { insertCustomerSchema } from "@shared/schema";
import { requireAuth } from "../auth";

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
    dealershipId: string;
    role?: string;
  };
}

// Helper to extract dealershipId from authenticated user
function getDealershipId(req: AuthRequest): string | null {
  return req.user?.dealershipId || null;
}

// Helper to extract userId from authenticated user
function getUserId(req: AuthRequest): string | null {
  return req.user?.id || null;
}

// ===== CUSTOMER ROUTES =====

// GET /api/customers - List all customers for dealership
router.get('/', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
    if (!dealershipId) {
      return res.status(403).json({ error: 'User must belong to a dealership' });
    }

    const customers = await storage.searchCustomers('', dealershipId);
    res.json(customers);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET /api/customers] Error:', errorMessage, error instanceof Error ? error.stack : '');
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

// GET /api/customers/search - Search customers by query
router.get('/search', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
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

// GET /api/customers/:id - Get single customer
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
    if (!dealershipId) {
      return res.status(403).json({ error: 'User must belong to a dealership' });
    }

    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Verify customer belongs to same dealership
    if (customer.dealershipId !== dealershipId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// POST /api/customers - Create new customer
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = insertCustomerSchema.parse(req.body);

    const dealershipId = getDealershipId(req);
    if (!dealershipId) {
      return res.status(403).json({ error: 'User must belong to a dealership to create customers' });
    }

    const customer = await storage.createCustomer(data, dealershipId);
    res.status(201).json(customer);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: errorMessage || 'Failed to create customer' });
  }
});

// PATCH /api/customers/:id - Update customer
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
    if (!dealershipId) {
      return res.status(403).json({ error: 'User must belong to a dealership' });
    }

    const existingCustomer = await storage.getCustomer(req.params.id);
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (existingCustomer.dealershipId !== dealershipId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await storage.updateCustomer(req.params.id, req.body);
    res.json(customer);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: errorMessage || 'Failed to update customer' });
  }
});

// GET /api/customers/:id/history - Get customer history
router.get('/:id/history', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
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

    const history = await storage.getCustomerHistory(req.params.id);
    res.json(history);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET /api/customers/:id/history] Error:', errorMessage, error instanceof Error ? error.stack : '');
    res.status(500).json({ error: 'Failed to get customer history' });
  }
});

// GET /api/customers/:id/notes - Get customer notes
router.get('/:id/notes', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET /api/customers/:id/notes] Error:', errorMessage, error instanceof Error ? error.stack : '');
    res.status(500).json({ error: 'Failed to get customer notes' });
  }
});

// POST /api/customers/:id/notes - Create customer note
router.post('/:id/notes', requireAuth, async (req, res) => {
  try {
    const dealershipId = getDealershipId(req);
    const userId = getUserId(req);

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POST /api/customers/:id/notes] Error:', errorMessage, error instanceof Error ? error.stack : '');
    res.status(400).json({ error: errorMessage || 'Failed to create customer note' });
  }
});

export default router;
