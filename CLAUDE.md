# Autolytiq Desk Studio - Project Rules & Constraints

## CRITICAL RULES (MUST FOLLOW)

### 1. Code Quality Gates

- **ALL commits MUST pass the compliance agent** before being finalized
- **NO JavaScript files** - TypeScript only (exceptions: config files like eslint.config.js, postcss.config.js, tailwind.config.js)
- **NO `any` types** - Use proper TypeScript types
- **ALL code must pass `npm run typecheck`** before commit
- **ALL code must pass `npm run lint`** before commit
- **ALL tests must pass** before commit

### 2. TypeScript Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3. API Contract

- Frontend API base URL: `/api/v1` (NOT `/api`)
- All backend services expose `/health` endpoint
- All API responses follow standard format:
  ```typescript
  interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
    statusCode: number;
  }
  ```

### 4. Service Architecture

**Required Services (ALL must be deployed):**
| Service | Port | Status |
|---------|------|--------|
| api-gateway | 8080 | REQUIRED |
| auth-service | 3001 | REQUIRED |
| user-service | 3002 | REQUIRED |
| customer-service | 3003 | REQUIRED |
| deal-service | 3004 | REQUIRED |
| inventory-service | 3005 | REQUIRED |
| email-service | 3006 | REQUIRED |
| config-service | 3007 | REQUIRED |
| settings-service | 3008 | REQUIRED |
| messaging-service | 3009 | REQUIRED |
| showroom-service | 3010 | REQUIRED |

### 5. Database Rules

- PostgreSQL with RDS
- All tables must have `dealership_id` for multi-tenancy
- All queries must filter by `dealership_id`
- Use parameterized queries (no string concatenation)
- Migrations in `services/init-db.sql`

### 6. Frontend Rules

- React + TypeScript + Vite
- TailwindCSS for styling
- React Query for data fetching
- All components in `client/src/components/`
- All hooks in `client/src/hooks/`
- All pages in `client/src/pages/`
- Shared design system in `shared/design-system/`

### 7. Testing Requirements

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
- Test files must end with `.test.ts` or `.spec.ts`
- Minimum coverage: 80%
- Run tests: `npm test`

---

## TECHNOLOGY STACK

### Frontend

- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** TailwindCSS
- **State:** React Query (TanStack Query)
- **Routing:** React Router v6

### Backend Services

- **Language:** Go 1.21+
- **Router:** Gorilla Mux
- **Database:** PostgreSQL via `lib/pq`

### Calculations

- **Language:** Rust compiled to WASM
- **Location:** `shared/autoTaxEngine/`
- **Precision:** rust_decimal for financial calculations

### Infrastructure

- **Cloud:** AWS (EKS, RDS, ECR, ALB)
- **Container:** Docker
- **Orchestration:** Kubernetes
- **IaC:** Terraform

---

## FILE STRUCTURE

```
autolytiq-desk-studio/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Page components
│   │   ├── lib/               # Utilities (api.ts)
│   │   └── layouts/           # Layout components
│   └── vite.config.ts
├── services/                  # Go microservices
│   ├── api-gateway/
│   ├── auth-service/
│   ├── customer-service/
│   ├── deal-service/
│   ├── email-service/
│   ├── inventory-service/
│   ├── user-service/
│   ├── config-service/
│   ├── settings-service/
│   ├── messaging-service/
│   └── showroom-service/
├── shared/                    # Shared code
│   ├── autoTaxEngine/         # Rust WASM tax engine
│   ├── design-system/         # UI components
│   └── types/                 # TypeScript types
├── tests/                     # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── infrastructure/            # Deployment configs
│   ├── k8s/
│   └── terraform/
└── docs/                      # Documentation
```

---

## DEPLOYMENT RULES

### Pre-Deployment Checklist

1. All tests pass: `npm test`
2. TypeScript compiles: `npm run typecheck`
3. Lint passes: `npm run lint`
4. Build succeeds: `npm run build`
5. Compliance agent approves commit

### Docker Build

```bash
# Always use --no-cache for production builds
docker build --no-cache -t <service-name>:<tag> .
```

### Kubernetes

- Namespace: `autolytiq-prod`
- All services need 3 replicas minimum
- HPA configured for auto-scaling
- PDB configured for availability

---

## PERFORMANCE TARGETS

| Metric              | Target  |
| ------------------- | ------- |
| API Response (p95)  | < 100ms |
| Tax Calculation     | < 1ms   |
| Finance Calculation | < 5ms   |
| Time to Interactive | < 1.5s  |
| Error Rate          | < 0.1%  |

---

## SECURITY REQUIREMENTS

- All endpoints require JWT authentication (except /health, /login)
- Passwords hashed with bcrypt (cost 12)
- HTTPS only (TLS 1.2+)
- CORS restricted to allowed origins
- SQL injection prevention via parameterized queries
- XSS prevention via proper encoding
- CSRF tokens for state-changing operations

---

## COMMON ISSUES & FIXES

### Issue: Frontend not showing data

**Cause:** API base URL mismatch
**Fix:** Ensure `client/src/lib/api.ts` uses `/api/v1`

### Issue: 401 Unauthorized

**Cause:** Missing or expired JWT token
**Fix:** Check token in localStorage, verify auth-service is running

### Issue: CORS errors

**Cause:** api-gateway not allowing origin
**Fix:** Add origin to CORS allowed list in api-gateway

### Issue: Database connection timeout

**Cause:** Security group or connection pool exhaustion
**Fix:** Check RDS security groups, increase pool size

---

## WORKFLOW FOR CLAUDE

### Before Making Changes

1. Read relevant files first
2. Check existing patterns in codebase
3. Verify against these rules

### When Writing Code

1. TypeScript only (no .js files)
2. Follow existing patterns
3. Add proper types
4. Include error handling

### Before Committing

1. Run `npm run typecheck`
2. Run `npm run lint`
3. Run `npm test`
4. Call compliance agent
5. Only then commit

### When Deploying

1. Build frontend: `cd client && npm run build`
2. Copy to api-gateway static dir
3. Build Docker image with `--no-cache`
4. Push to ECR
5. Update k8s deployment
6. Verify pods are running
7. Test endpoints manually

---

## CONTACTS & RESOURCES

- **ECR Registry:** 730335214557.dkr.ecr.us-east-1.amazonaws.com
- **RDS Endpoint:** autolytiq-prod.cluster-cpw2c8ka2mow.us-east-1.rds.amazonaws.com
- **Production URL:** https://app.autolytiq.com (via ALB)
- **Kubernetes Namespace:** autolytiq-prod

---

**Last Updated:** 2025-11-27
**Version:** 1.0.0
