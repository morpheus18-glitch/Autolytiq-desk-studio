#!/bin/bash
#
# Setup Clean Rebuild Architecture
#
# This script initializes the complete directory structure and
# scaffolding for the Autolytiq clean rebuild.
#
# Usage: bash scripts/setup-clean-rebuild.sh
#
# IMPORTANT: Review CLEAN_REBUILD_FOUNDATION_PLAN.md before running!

set -e  # Exit on error

echo "=========================================="
echo "Autolytiq Clean Rebuild - Setup"
echo "=========================================="
echo ""

# Confirm execution
read -p "Have you reviewed CLEAN_REBUILD_FOUNDATION_PLAN.md? (yes/no): " confirmed
if [ "$confirmed" != "yes" ]; then
    echo "Please review the plan first, then run this script."
    exit 1
fi

echo ""
echo "Creating directory structure..."
echo ""

# Frontend directories
mkdir -p frontend/src/app/{auth,dashboard,api}
mkdir -p frontend/src/app/dashboard/{deals,customers,inventory,email,reports}
mkdir -p frontend/src/modules/{deals,customers,inventory,tax,email}/{components,hooks,types}
mkdir -p frontend/src/core/{config,http,logger,types,ui/{components,design-tokens}}
mkdir -p frontend/public/images

# Services directories
mkdir -p services/tax-engine-rs/src/{models,calculator,state_rules,local_rates,utils,wasm}
mkdir -p services/tax-engine-rs/{tests/{integration,unit},benches,data}

mkdir -p services/deal-engine-go/{cmd/server,internal/{domain,handlers,repository,service},pkg/{logger,config,middleware},api,tests/{integration,unit},migrations}

mkdir -p services/customer-service-go/{cmd/server,internal/{domain,handlers,repository,service},pkg/{logger,config,middleware},api,tests/{integration,unit},migrations}

mkdir -p services/inventory-service-go/{cmd/server,internal/{domain,handlers,repository,service},pkg/{logger,config,middleware},api,tests/{integration,unit},migrations}

# Gateway directories
mkdir -p gateway/src/{routes,middleware,services,types,config,logger}

# Shared directories
mkdir -p shared/{contracts/openapi,types,scripts}

# Infrastructure directories
mkdir -p infrastructure/{docker,k8s/services,ci}

# Documentation
mkdir -p docs

# Scripts
mkdir -p scripts

echo "✅ Directory structure created"
echo ""

# Create placeholder files to preserve structure in git
echo "Creating .gitkeep files..."

find frontend services gateway shared infrastructure docs -type d -empty -exec touch {}/.gitkeep \;

echo "✅ .gitkeep files created"
echo ""

# Create root package.json
echo "Creating root package.json..."

cat > package.json << 'EOF'
{
  "name": "autolytiq-clean",
  "version": "2.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "gateway"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=frontend & npm run dev --workspace=gateway",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "validate": "npm run lint && npm run typecheck && npm run test",
    "generate-types": "bash shared/scripts/generate-types.sh",
    "setup:frontend": "bash scripts/setup-frontend.sh",
    "setup:rust": "bash scripts/setup-rust.sh",
    "setup:go": "bash scripts/setup-go-service.sh"
  },
  "devDependencies": {
    "prettier": "^3.1.0",
    "turbo": "^1.11.0"
  }
}
EOF

echo "✅ Root package.json created"
echo ""

# Create .prettierrc.json
echo "Creating Prettier config..."

cat > .prettierrc.json << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF

echo "✅ Prettier config created"
echo ""

# Create root .gitignore (merge with existing)
echo "Creating .gitignore..."

cat >> .gitignore << 'EOF'

# Clean rebuild artifacts
frontend/dist
frontend/.next
frontend/out
gateway/dist
services/*/target
services/*/pkg
*.wasm
*.profraw

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
EOF

echo "✅ .gitignore updated"
echo ""

# Create setup scripts for individual components
echo "Creating component setup scripts..."

# Frontend setup script
cat > scripts/setup-frontend.sh << 'EOF'
#!/bin/bash
set -e

echo "Setting up frontend (Next.js)..."

cd frontend

# Create package.json
cat > package.json << 'PACKAGE'
{
  "name": "@autolytiq/frontend",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.60.5",
    "zod": "^3.24.2",
    "pino": "^9.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.16.11",
    "@types/react": "^18.3.11",
    "typescript": "^5.6.3",
    "vitest": "^4.0.8"
  }
}
PACKAGE

# Install dependencies
npm install

echo "✅ Frontend setup complete"
EOF

chmod +x scripts/setup-frontend.sh

# Rust setup script
cat > scripts/setup-rust.sh << 'EOF'
#!/bin/bash
set -e

echo "Setting up Rust tax engine..."

cd services/tax-engine-rs

# Create Cargo.toml
cat > Cargo.toml << 'CARGO'
[package]
name = "tax-engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rust_decimal = "1.36"
rust_decimal_macros = "1.36"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = 3
lto = true
CARGO

# Create build script
cat > build.sh << 'BUILD'
#!/bin/bash
set -e

echo "Building tax-engine to WASM..."

if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    cargo install wasm-pack
fi

# Build for Node.js
wasm-pack build --target nodejs --out-dir ../../gateway/src/wasm/tax-engine-node

echo "✅ WASM build complete"
BUILD

chmod +x build.sh

echo "✅ Rust setup complete"
EOF

chmod +x scripts/setup-rust.sh

# Go service setup script
cat > scripts/setup-go-service.sh << 'EOF'
#!/bin/bash
set -e

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
    echo "Usage: bash scripts/setup-go-service.sh <service-name>"
    echo "Example: bash scripts/setup-go-service.sh deal-engine-go"
    exit 1
fi

echo "Setting up Go service: $SERVICE_NAME..."

cd "services/$SERVICE_NAME"

# Initialize Go module
go mod init "$SERVICE_NAME"

# Create main.go
mkdir -p cmd/server
cat > cmd/server/main.go << 'MAIN'
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    port := 3001
    log.Printf("Starting server on port %d...", port)
    log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
MAIN

# Create Makefile
cat > Makefile << 'MAKE'
.PHONY: build run test

build:
	go build -o bin/server cmd/server/main.go

run:
	go run cmd/server/main.go

test:
	go test ./...
MAKE

echo "✅ Go service $SERVICE_NAME setup complete"
EOF

chmod +x scripts/setup-go-service.sh

echo "✅ Setup scripts created"
echo ""

# Create validation script
cat > scripts/validate-all.sh << 'EOF'
#!/bin/bash
set -e

echo "Running all validation checks..."
echo ""

# Lint
echo "1. Linting..."
npm run lint
echo "✅ Lint passed"
echo ""

# Type check
echo "2. Type checking..."
npm run typecheck
echo "✅ Type check passed"
echo ""

# Tests
echo "3. Running tests..."
npm run test
echo "✅ Tests passed"
echo ""

# Build
echo "4. Building..."
npm run build
echo "✅ Build passed"
echo ""

echo "=========================================="
echo "All validation checks passed! ✅"
echo "=========================================="
EOF

chmod +x scripts/validate-all.sh

echo "✅ Validation script created"
echo ""

# Create README for docs
cat > docs/README.md << 'EOF'
# Autolytiq Documentation

## Architecture Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [API_CONTRACTS.md](API_CONTRACTS.md) - API specifications
- [LOGGING_STANDARDS.md](LOGGING_STANDARDS.md) - Logging guidelines
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migration from old to new
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

## Quick Links

- **Root:** [/CLEAN_REBUILD_FOUNDATION_PLAN.md](../CLEAN_REBUILD_FOUNDATION_PLAN.md)
- **Tax Engine:** [/TAX_ENGINE_MIGRATION_STRATEGY.md](../TAX_ENGINE_MIGRATION_STRATEGY.md)
- **Architecture Rules:** [/ARCHITECTURE_RULES.md](../ARCHITECTURE_RULES.md)
- **Agent Workflow:** [/AGENT_WORKFLOW_GUIDE.md](../AGENT_WORKFLOW_GUIDE.md)

## Getting Started

See [CLEAN_REBUILD_FOUNDATION_PLAN.md](../CLEAN_REBUILD_FOUNDATION_PLAN.md) for complete setup instructions.
EOF

echo "✅ Documentation README created"
echo ""

# Summary
echo ""
echo "=========================================="
echo "Setup Complete! ✅"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Review the created structure:"
echo "   tree -L 3 -d frontend services gateway"
echo ""
echo "2. Initialize individual components:"
echo "   npm run setup:frontend"
echo "   npm run setup:rust"
echo "   npm run setup:go deal-engine-go"
echo ""
echo "3. Install root dependencies:"
echo "   npm install"
echo ""
echo "4. Start development:"
echo "   npm run dev"
echo ""
echo "5. Read the documentation:"
echo "   - CLEAN_REBUILD_FOUNDATION_PLAN.md"
echo "   - TAX_ENGINE_MIGRATION_STRATEGY.md"
echo ""
echo "=========================================="
echo ""
