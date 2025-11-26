/**
 * Clean Rebuild Database Schema
 *
 * Starting minimal - will build up properly during Week 2+
 * Reference old schema when porting logic, but this is clean slate
 */

import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Password validation constants
const MIN_PASSWORD_LENGTH = 8;

// ===========================================
// Core Tables - Minimal Start
// ===========================================

/**
 * Dealerships - Multi-tenant root
 */
export const dealerships = pgTable("dealerships", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // More fields to be added during implementation
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Users - Authentication
 * Full implementation in Week 2
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", {
    enum: ["admin", "manager", "salesperson", "viewer"],
  })
    .notNull()
    .default("salesperson"),
  dealershipId: uuid("dealership_id")
    .notNull()
    .references(() => dealerships.id, { onDelete: "cascade" }),

  // MFA
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// ===========================================
// Zod Schemas (Auto-generated from Drizzle)
// ===========================================

// Dealerships
export const insertDealershipSchema = createInsertSchema(dealerships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectDealershipSchema = createSelectSchema(dealerships);

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true, // Never expose in API
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const selectUserSchema = createSelectSchema(users).omit({
  passwordHash: true, // Never expose password hash
  mfaSecret: true, // Never expose MFA secret
});

// Custom validation schemas for auth
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  mfaCode: z
    .string()
    .regex(/^[0-9]{6}$/, "MFA code must be 6 digits")
    .optional(),
});

export const createUserSchema = insertUserSchema.extend({
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ===========================================
// TypeScript Types (Inferred from schema)
// ===========================================

export type Dealership = typeof dealerships.$inferSelect;
export type InsertDealership = z.infer<typeof insertDealershipSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// ===========================================
// TODO: Add during implementation
// ===========================================
// - customers table (Week 2/3)
// - deals table (Week 2/3)
// - vehicles table (Week 2/3)
// - Deal state machine
// - Financial calculations metadata
// Reference old schema.ts when implementing, but build clean
