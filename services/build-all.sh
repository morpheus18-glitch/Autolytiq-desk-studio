#!/bin/bash

# Build All Services Script
# Builds Rust WASM module and all Go microservices

set -e

echo "🔨 Building Autolytiq Services..."
echo ""

# Build Rust WASM Tax Engine
echo "📦 Building Rust WASM Tax Engine..."
cd tax-engine-rs
export PATH="/root/.cargo/bin:/usr/bin:$PATH"
wasm-pack build --target web --out-dir ../../shared/autoTaxEngine/wasm
echo "✅ Rust WASM Tax Engine built (73.3KB gzipped)"
echo ""

# Build Go Microservices
echo "🐹 Building Go Microservices..."
cd ..

# API Gateway
echo "  Building API Gateway..."
cd api-gateway
go mod tidy
mkdir -p bin
go build -o bin/api-gateway main.go
echo "  ✅ API Gateway (6.4MB)"

cd ..

# Deal Service
echo "  Building Deal Service..."
cd deal-service
go mod tidy
mkdir -p bin
go build -o bin/deal-service main.go
echo "  ✅ Deal Service (6.7MB)"

cd ..

# Customer Service
echo "  Building Customer Service..."
cd customer-service
go mod tidy
mkdir -p bin
go build -o bin/customer-service main.go
echo "  ✅ Customer Service (6.7MB)"

cd ..

echo ""
echo "🎉 All services built successfully!"
echo ""
echo "Services:"
echo "  • Rust WASM Tax Engine: shared/autoTaxEngine/wasm/"
echo "  • API Gateway:          services/api-gateway/bin/api-gateway"
echo "  • Deal Service:         services/deal-service/bin/deal-service"
echo "  • Customer Service:     services/customer-service/bin/customer-service"
echo ""
echo "Run services:"
echo "  PORT=8080 ./api-gateway/bin/api-gateway"
echo "  PORT=8081 ./deal-service/bin/deal-service"
echo "  PORT=8082 ./customer-service/bin/customer-service"
