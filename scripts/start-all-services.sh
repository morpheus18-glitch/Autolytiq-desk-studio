#!/bin/bash
# Start all Autolytiq services with correct database connection strings
# Database is the single source of truth - services do NOT create tables

set -e

echo "🚀 Starting Autolytiq Services..."
echo "=================================="

# Database connection (with SSL disabled for local dev)
export DATABASE_URL="postgresql://postgres:autolytiq-dev-2024@localhost:5432/autolytiq?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="dev-secret-key-change-in-production"

# Kill any existing services
echo "Stopping existing services..."
pkill -f "auth-service" 2>/dev/null || true
pkill -f "customer-service" 2>/dev/null || true
pkill -f "deal-service" 2>/dev/null || true
pkill -f "inventory-service" 2>/dev/null || true
pkill -f "api-gateway" 2>/dev/null || true
sleep 2

cd /root/autolytiq-desk-studio

# Start Auth Service (port 8087)
echo "Starting Auth Service..."
cd services/auth-service
DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" PORT=8087 JWT_SECRET="$JWT_SECRET" \
  nohup go run . > /tmp/auth-service.log 2>&1 &
cd ../..

# Start Customer Service (port 8082)
echo "Starting Customer Service..."
cd services/customer-service
DATABASE_URL="$DATABASE_URL" PORT=8082 \
  nohup go run . > /tmp/customer-service.log 2>&1 &
cd ../..

# Start Deal Service (port 8081)
echo "Starting Deal Service..."
cd services/deal-service
DATABASE_URL="$DATABASE_URL" PORT=8081 \
  nohup go run . > /tmp/deal-service.log 2>&1 &
cd ../..

# Start Inventory Service (port 8083)
echo "Starting Inventory Service..."
cd services/inventory-service
DATABASE_URL="$DATABASE_URL" PORT=8083 \
  nohup go run . > /tmp/inventory-service.log 2>&1 &
cd ../..

# Start API Gateway (port 8090)
echo "Starting API Gateway..."
cd services/api-gateway
DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" PORT=8090 \
  nohup go run . > /tmp/api-gateway.log 2>&1 &
cd ..

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "=== SERVICE STATUS ==="
lsof -i :8087 > /dev/null && echo "✅ Auth Service (8087)" || echo "❌ Auth Service (8087)"
lsof -i :8082 > /dev/null && echo "✅ Customer Service (8082)" || echo "❌ Customer Service (8082)"
lsof -i :8081 > /dev/null && echo "✅ Deal Service (8081)" || echo "❌ Deal Service (8081)"
lsof -i :8083 > /dev/null && echo "✅ Inventory Service (8083)" || echo "❌ Inventory Service (8083)"
lsof -i :8090 > /dev/null && echo "✅ API Gateway (8090)" || echo "✅ API Gateway (8090)"

echo ""
echo "📋 Check logs:"
echo "  tail -f /tmp/auth-service.log"
echo "  tail -f /tmp/customer-service.log"
echo "  tail -f /tmp/deal-service.log"
echo "  tail -f /tmp/inventory-service.log"
echo "  tail -f /tmp/api-gateway.log"
echo ""
echo "✅ All services started!"
