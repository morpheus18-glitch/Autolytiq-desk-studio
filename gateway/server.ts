/**
 * API Gateway Server
 *
 * Entry point for all HTTP requests.
 * Routes to appropriate modules with validation.
 */

import express, { type Express } from 'express';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { createAuthRouter } from '../src/modules/auth';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Routes
app.use('/api/auth', createAuthRouter(db));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, db };
