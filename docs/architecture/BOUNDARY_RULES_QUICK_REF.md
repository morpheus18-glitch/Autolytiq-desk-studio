# Module Boundary Rules - Quick Reference

**Purpose:** Prevent spaghetti code and enforce clean architecture.

---

## The Rules (Simple Version)

### ✅ ALWAYS ALLOWED

```typescript
// Core can import from core and shared
// File: src/core/**/*.ts
import { something } from '@/core/utils';
import { schema } from '@shared/schema';

// Modules can import from core, shared, and own module
// File: src/modules/deal/**/*.ts
import { db } from '@/core/database';
import { schema } from '@shared/schema';
import { DealService } from './services/deal.service'; // same module

// Client can import from client, core, shared, module public APIs
// File: client/src/**/*.tsx
import { Button } from '@/components/ui/button';
import { db } from '@/core/database';
import { DealService } from '@/modules/deal'; // public API only

// Server can import from server, core, shared, module public APIs
// File: server/**/*.ts
import { storage } from './storage';
import { db } from '@/core/database';
import { DealService } from '@/modules/deal'; // public API only
```

---

### ❌ NEVER ALLOWED

```typescript
// Core CANNOT import from server, client, or modules
// File: src/core/**/*.ts
import { storage } from '../../../server/storage'; // ❌ VIOLATION

// Modules CANNOT import from other module internals
// File: src/modules/deal/**/*.ts
import { TaxCalculator } from '../../tax/services/tax-calculator'; // ❌ VIOLATION
// Use public API instead:
import { TaxService } from '@/modules/tax'; // ✅ CORRECT

// Modules CANNOT import from server or client (except hooks/routes - see below)
// File: src/modules/deal/services/deal.service.ts
import { storage } from '../../../../server/storage'; // ❌ VIOLATION
```

---

### ⚠️ SPECIAL EXCEPTIONS

#### 1. Module API Routes CAN Import from Server

Module routes (`src/modules/*/api/*.routes.ts`) are **server-side code** and can access server layer:

```typescript
// File: src/modules/deal/api/deal.routes.ts
import { Router } from 'express';
import { storage } from '../../../../server/storage'; // ✅ ALLOWED for routes
import { legacyService } from '../../../../server/services/legacy'; // ✅ ALLOWED for routes
```

**Why?** API routes are application glue between modules and server infrastructure.

---

#### 2. Module React Hooks CAN Import from Client

Module hooks (`src/modules/*/hooks/**/*.ts`) are **client-side code** and can access client layer:

```typescript
// File: src/modules/auth/hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../../client/src/lib/queryClient'; // ✅ ALLOWED for hooks
import { useToast } from '@/hooks/use-toast'; // ✅ ALLOWED for hooks
```

**Why?** React hooks are UI glue between modules and client infrastructure.

---

## Layer Hierarchy

```
┌─────────────────────────────────────┐
│  CLIENT (pages, components, UI)     │  ← Application Layer
├─────────────────────────────────────┤
│  SERVER (routes, middleware, APIs)  │  ← Application Layer
├─────────────────────────────────────┤
│  MODULES (business logic)           │  ← Domain Layer
│  - services/                        │
│  - types/                           │
│  - utils/                           │
│  - api/ (routes) ───→ can use SERVER│  ← Exception
│  - hooks/ ──────────→ can use CLIENT│  ← Exception
├─────────────────────────────────────┤
│  CORE (infrastructure)              │  ← Foundation Layer
│  - database/                        │
│  - config/                          │
│  - logger/                          │
│  - utils/                           │
├─────────────────────────────────────┤
│  SHARED (schemas, types, utilities) │  ← Foundation Layer
└─────────────────────────────────────┘

Import Direction: ↓ (can only import DOWN the hierarchy)
```

---

## Common Mistakes & Fixes

### Mistake 1: Importing Module Internals

```typescript
// ❌ WRONG
import { DealCalculator } from '@/modules/deal/services/deal-calculator';

// ✅ CORRECT - Use public API
import { DealService } from '@/modules/deal';
const calculator = new DealService();
```

---

### Mistake 2: Core Importing from Server

```typescript
// ❌ WRONG - Core importing server
// File: src/core/database/storage.service.ts
import { db } from '../../../server/database/db-service';

// ✅ CORRECT - Move server DB files to core
// File: src/core/database/storage.service.ts
import { db } from './db-service';
```

---

### Mistake 3: Module Service Importing from Server

```typescript
// ❌ WRONG - Module service importing server
// File: src/modules/deal/services/deal.service.ts
import { storage } from '../../../../server/storage';

// ✅ CORRECT - Import from core or inject dependency
// File: src/modules/deal/services/deal.service.ts
import { getStorageService } from '@/core/database';
const storage = getStorageService();
```

---

### Mistake 4: Shared Importing from Anywhere

```typescript
// ❌ WRONG - Shared importing from modules/server/client
// File: shared/utils/validators.ts
import { DealService } from '../../src/modules/deal';

// ✅ CORRECT - Shared only imports shared
// File: shared/utils/validators.ts
import { DealSchema } from '../schema';
```

---

## How to Fix Violations

### Step 1: Identify the Violation

```bash
# Check for core importing server
grep -r "from.*server/" src/core --include="*.ts"

# Check for modules importing client (exclude hooks)
grep -r "from.*client/" src/modules --include="*.ts" | grep -v "/hooks/"
```

---

### Step 2: Choose the Right Fix

| Violation | Fix Strategy |
|-----------|-------------|
| Core → Server | Move server code to core OR use dependency injection |
| Module → Other Module | Use other module's public API (`index.ts`) |
| Module Service → Server | Import from core OR inject dependency |
| Module Service → Client | Move shared code to core |
| Shared → Anything | Move code out of shared OR remove dependency |

---

### Step 3: Apply the Fix

**Example: Core importing from server**

```typescript
// BEFORE
// File: src/core/utils/logger.ts
import { db } from '../../../server/database/db';

// AFTER - Move DB to core
// File: src/core/utils/logger.ts
import { db } from '../database';
```

**Example: Module importing module internals**

```typescript
// BEFORE
// File: src/modules/deal/services/deal.service.ts
import { calculateTax } from '../../tax/services/tax-calculator';

// AFTER - Use public API
// File: src/modules/deal/services/deal.service.ts
import { TaxService } from '@/modules/tax';
const taxService = new TaxService();
const result = taxService.calculateTax(...);
```

---

## Enforcement

Violations are **automatically blocked** by:

1. **Pre-commit hook** - Runs ESLint before every commit
2. **CI/CD pipeline** - Blocks PR merge if violations found
3. **ESLint in IDE** - Real-time warnings while coding

---

## When in Doubt

Ask yourself:

1. **Is this code infrastructure?** → Put in `src/core/`
2. **Is this code business logic?** → Put in `src/modules/`
3. **Is this code an API route?** → `src/modules/*/api/` (can access server)
4. **Is this code a React hook?** → `src/modules/*/hooks/` (can access client)
5. **Is this code shared across everything?** → Put in `shared/`

---

## Summary

**Golden Rules:**
1. Core is the foundation - it imports NOTHING except shared
2. Modules are pure business logic - they import core and shared
3. Routes and hooks are glue code - they can bridge layers
4. Always use public APIs when importing modules

**When you see a violation:** Don't disable ESLint. Fix the architecture.

---

**For more details, see:** `/BOUNDARY_VIOLATIONS_FIXED.md`
