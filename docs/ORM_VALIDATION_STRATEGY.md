# ORM & Validation Strategy

**Decision:** Drizzle ORM + Zod (TypeScript), sqlc (Go), SQLAlchemy (Python)

**Last Updated:** November 23, 2025
**Status:** ACTIVE - Already implemented

---

## Stack Overview

| Layer | Tool | Purpose |
|-------|------|---------|
| **TypeScript (Frontend/Gateway)** | Drizzle ORM + Zod | Type-safe DB access, validation |
| **Go Services** | sqlc | Generate type-safe Go from SQL |
| **Python (AI/ML)** | SQLAlchemy + Pydantic | ORM + validation |
| **Schema Source** | PostgreSQL | Single source of truth |

---

## TypeScript: Drizzle + Zod (CURRENT - KEEP!)

### Why This is Perfect

**Drizzle ORM:**
- ✅ TypeScript-first with perfect inference
- ✅ SQL-like syntax (familiar for SQL devs)
- ✅ Lightweight (zero runtime overhead)
- ✅ Drizzle Kit for migrations
- ✅ Already working in your codebase!

**Zod:**
- ✅ Runtime validation
- ✅ Auto-generates from Drizzle schemas
- ✅ API request/response validation
- ✅ React Hook Form integration

### Current Pattern (Keep This!)

```typescript
// shared/schema.ts
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// 1. Define Drizzle table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", {
    enum: ['admin', 'manager', 'salesperson', 'viewer']
  }).notNull().default('salesperson'),
  dealershipId: uuid("dealership_id").notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 2. Auto-generate Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true, // Never expose in API
});

export const selectUserSchema = createSelectSchema(users).omit({
  passwordHash: true,
  mfaSecret: true,
});

// 3. Custom schemas for API endpoints
export const createUserSchema = insertUserSchema.extend({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string().uuid(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().length(6).optional(),
});

// 4. Infer TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
```

### Database Access

```typescript
// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/shared/schema";

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });
```

### API Endpoint with Validation

```typescript
// server/routes/users.ts
import { db } from "@/server/db";
import { users, createUserSchema } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/auth";

app.post('/api/users', async (req, res) => {
  try {
    // 1. Validate request body with Zod
    const validData = createUserSchema.parse(req.body);

    // 2. Hash password
    const passwordHash = await hashPassword(validData.password);

    // 3. Insert user (type-safe!)
    const [newUser] = await db.insert(users).values({
      email: validData.email,
      name: validData.name,
      passwordHash,
      role: validData.role,
      dealershipId: validData.dealershipId,
    }).returning();

    // 4. Return user (password excluded by selectUserSchema)
    res.json(newUser);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    logger.error({ error, msg: 'USER_CREATE_FAILED' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});
```

### Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Push migration to database
npm run db:push

# View database in UI
npm run db:studio
```

**drizzle.config.ts:**
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## Go Services: sqlc (Type-Safe SQL → Go)

### Why sqlc for Go Services

- ✅ Write SQL, get type-safe Go code
- ✅ Catches SQL errors at compile time
- ✅ Zero runtime overhead
- ✅ Works with existing PostgreSQL schema

### Setup

```bash
# Install sqlc
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Create config
cat > services/auth-go/sqlc.yaml <<EOF
version: "2"
sql:
  - engine: "postgresql"
    queries: "queries/"
    schema: "../../migrations/"
    gen:
      go:
        package: "db"
        out: "db"
        emit_json_tags: true
        emit_interface: true
EOF
```

### Write SQL Queries

```sql
-- services/auth-go/queries/users.sql

-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (
  email, name, password_hash, role, dealership_id
) VALUES (
  $1, $2, $3, $4, $5
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET name = $2, role = $3, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: ListUsersByDealership :many
SELECT * FROM users
WHERE dealership_id = $1
ORDER BY created_at DESC;
```

### Generate Go Code

```bash
cd services/auth-go
sqlc generate
```

**Generated code (db/users.sql.go):**
```go
package db

import (
    "context"
    "time"
)

type User struct {
    ID           string    `json:"id"`
    Email        string    `json:"email"`
    Name         string    `json:"name"`
    PasswordHash string    `json:"password_hash"`
    Role         string    `json:"role"`
    DealershipID string    `json:"dealership_id"`
    MfaEnabled   bool      `json:"mfa_enabled"`
    MfaSecret    *string   `json:"mfa_secret"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

func (q *Queries) GetUser(ctx context.Context, id string) (User, error) { ... }
func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) { ... }
// ... etc
```

### Use in Go Service

```go
// services/auth-go/handlers/login.go
package handlers

import (
    "services/auth-go/db"
    "github.com/gin-gonic/gin"
)

func (h *Handler) Login(c *gin.Context) {
    var req struct {
        Email    string `json:"email" binding:"required,email"`
        Password string `json:"password" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Use sqlc-generated code (type-safe!)
    user, err := h.queries.GetUserByEmail(c.Request.Context(), req.Email)
    if err != nil {
        c.JSON(401, gin.H{"error": "Invalid credentials"})
        return
    }

    // Verify password
    if !verifyPassword(req.Password, user.PasswordHash) {
        c.JSON(401, gin.H{"error": "Invalid credentials"})
        return
    }

    // Generate JWT
    token := generateJWT(user)

    c.JSON(200, gin.H{
        "token": token,
        "user": gin.H{
            "id": user.ID,
            "email": user.Email,
            "name": user.Name,
            "role": user.Role,
        },
    })
}
```

---

## Python Services: SQLAlchemy + Pydantic

### For AI Agent & ML Pipeline

```python
# services/ai-agent-py/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="salesperson")
    dealership_id = Column(UUID(as_uuid=True), ForeignKey("dealerships.id"), nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dealership = relationship("Dealership", back_populates="users")
```

### Pydantic Schemas (Validation)

```python
# services/ai-agent-py/schemas/user.py
from pydantic import BaseModel, EmailStr, UUID4
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str

class UserCreate(UserBase):
    password: str
    dealership_id: UUID4

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None

class UserResponse(UserBase):
    id: UUID4
    dealership_id: UUID4
    mfa_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2
```

### Use in FastAPI

```python
# services/ai-agent-py/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .models import User
from .schemas import UserCreate, UserResponse

router = APIRouter()

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    # Check if user exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        dealership_id=user_data.dealership_id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
```

---

## Shared Schema Strategy

### Single Source of Truth: PostgreSQL

```
PostgreSQL Schema (migrations/)
         │
         ├─→ Drizzle (TypeScript)
         │   └─→ Zod schemas (auto-generated)
         │
         ├─→ sqlc (Go)
         │   └─→ Type-safe Go code (auto-generated)
         │
         └─→ SQLAlchemy (Python)
             └─→ Pydantic schemas (manual)
```

### Migration Workflow

1. **Make schema changes in Drizzle** (TypeScript)
   ```typescript
   // shared/schema.ts
   export const users = pgTable("users", { ... });
   ```

2. **Generate migration**
   ```bash
   npm run db:generate
   ```

3. **Review migration SQL**
   ```sql
   -- migrations/0001_create_users.sql
   CREATE TABLE users ( ... );
   ```

4. **Apply to database**
   ```bash
   npm run db:push
   ```

5. **Regenerate Go code** (if affected)
   ```bash
   cd services/auth-go && sqlc generate
   ```

6. **Update Python models** (manual sync)
   ```python
   # services/ai-agent-py/models/user.py
   class User(Base): ...
   ```

---

## Validation Layers

### 1. Database Level (PostgreSQL)
```sql
-- NOT NULL constraints
email TEXT NOT NULL

-- CHECK constraints
CHECK (role IN ('admin', 'manager', 'salesperson', 'viewer'))

-- UNIQUE constraints
UNIQUE(email)

-- Foreign keys
FOREIGN KEY (dealership_id) REFERENCES dealerships(id)
```

### 2. ORM Level (Drizzle/sqlc/SQLAlchemy)
```typescript
// Type safety at compile time
const user: User = await db.query.users.findFirst();
user.email // ✅ string
user.age   // ❌ Property 'age' does not exist
```

### 3. Schema Level (Zod/Pydantic)
```typescript
// Runtime validation
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
});

schema.parse({ email: "invalid", age: 15 });
// ❌ Throws ZodError with detailed messages
```

### 4. API Level (Request validation)
```typescript
app.post('/api/users', validate(createUserSchema), async (req, res) => {
  // req.body is validated and typed
});
```

---

## Summary: Your Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Schema Definition** | Drizzle (TypeScript) | Single source of truth |
| **TS Runtime Validation** | Zod | API validation, forms |
| **TS DB Access** | Drizzle ORM | Type-safe queries |
| **Go DB Access** | sqlc | Generated type-safe code |
| **Python DB Access** | SQLAlchemy | ORM for AI/ML services |
| **Python Validation** | Pydantic | API validation |
| **Migrations** | Drizzle Kit | Schema migrations |

**Key Decision:** You're already using Drizzle + Zod. **Keep it!** It's the right choice.

---

## Next Steps

1. ✅ **Keep current setup** (Drizzle + Zod)
2. ⏳ **Add sqlc** for Go services
3. ⏳ **Add SQLAlchemy + Pydantic** for Python services
4. ⏳ **Document migration workflow** for team

**No changes needed to your current TypeScript setup - it's perfect!**
