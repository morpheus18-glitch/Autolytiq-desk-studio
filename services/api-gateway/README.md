# API Gateway

The API Gateway serves as the single entry point for all client requests. It validates JWT tokens, extracts tenant context, and proxies requests to the appropriate backend service.

## Responsibilities

1. **Authentication**: Validates JWT bearer tokens on all protected routes
2. **Tenant Isolation**: Extracts `dealership_id` from JWT claims and injects `X-Dealership-ID` header
3. **Request Routing**: Proxies requests to backend services based on URL path
4. **Audit Context**: Adds `X-User-ID`, `X-User-Email`, `X-User-Role` headers for logging

## Request Flow

```
Client                  API Gateway                    Backend Service
  │                          │                              │
  │  POST /api/v1/deals      │                              │
  │  Authorization: Bearer...│                              │
  │─────────────────────────►│                              │
  │                          │                              │
  │                          │ ─── Validate JWT ────        │
  │                          │ ─── Extract claims ──        │
  │                          │ ─── Add X-Dealership-ID ──   │
  │                          │                              │
  │                          │  POST /api/v1/deals          │
  │                          │  X-Dealership-ID: dlr_123    │
  │                          │  X-User-ID: usr_456          │
  │                          │─────────────────────────────►│
  │                          │                              │
  │                          │◄─────────────────────────────│
  │◄─────────────────────────│                              │
```

## Configuration

| Variable                | Default                 | Description                                       |
| ----------------------- | ----------------------- | ------------------------------------------------- |
| `PORT`                  | `8080`                  | Listen port                                       |
| `JWT_SECRET`            | —                       | **Required.** Signing key (minimum 32 characters) |
| `JWT_ISSUER`            | `autolytiq-api-gateway` | Expected `iss` claim                              |
| `ALLOWED_ORIGINS`       | `http://localhost:5173` | CORS whitelist                                    |
| `DEAL_SERVICE_URL`      | `http://localhost:8081` | Deal service endpoint                             |
| `CUSTOMER_SERVICE_URL`  | `http://localhost:8082` | Customer service endpoint                         |
| `INVENTORY_SERVICE_URL` | `http://localhost:8083` | Inventory service endpoint                        |
| `EMAIL_SERVICE_URL`     | `http://localhost:8084` | Email service endpoint                            |
| `USER_SERVICE_URL`      | `http://localhost:8085` | User service endpoint                             |
| `CONFIG_SERVICE_URL`    | `http://localhost:8086` | Config service endpoint                           |
| `TAX_SERVICE_URL`       | `http://localhost:8087` | Tax service endpoint                              |

## Running

```bash
export JWT_SECRET="your-secret-key-at-least-32-characters"
go run .
```

The gateway listens on port 8080 by default.

## Route Mapping

| Path Prefix         | Backend           |
| ------------------- | ----------------- |
| `/api/v1/deals`     | Deal Service      |
| `/api/v1/customers` | Customer Service  |
| `/api/v1/inventory` | Inventory Service |
| `/api/v1/email`     | Email Service     |
| `/api/v1/users`     | User Service      |
| `/api/v1/config`    | Config Service    |
| `/api/v1/tax`       | Tax Service       |

## JWT Claims

Expected token structure:

```json
{
  "user_id": "usr_123",
  "dealership_id": "dlr_456",
  "email": "user@dealership.com",
  "role": "admin",
  "iss": "autolytiq-api-gateway",
  "exp": 1735689600
}
```

The `dealership_id` claim is mandatory for all authenticated requests.

## Error Responses

| Condition                      | Status | Body                                       |
| ------------------------------ | ------ | ------------------------------------------ |
| Missing `Authorization` header | 401    | `{"error":"Missing authorization header"}` |
| Invalid token format           | 401    | `{"error":"Invalid authorization format"}` |
| Expired or invalid signature   | 401    | `{"error":"Invalid token: ..."}`           |
| Missing `dealership_id` claim  | 400    | `{"error":"Missing dealership context"}`   |

## Health Check

```bash
curl http://localhost:8080/health
# {"status":"healthy","service":"api-gateway"}
```

## License

Proprietary - Autolytiq
