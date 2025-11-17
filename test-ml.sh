#!/bin/bash

# ML Integration Test Script
# Tests the ML optimization endpoints

BASE_URL="http://localhost:5000"
echo "Testing ML Optimization Endpoints"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Note: You'll need to login first and get an auth cookie
# For now, these tests will need authentication

echo "Test 1: Analyze a deal with ML optimization"
echo "-------------------------------------------"
curl -X POST "${BASE_URL}/api/ml/analyze" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "vehiclePrice": 25000,
    "downPayment": 2500,
    "tradeValue": 5000,
    "tradePayoff": 3000,
    "termMonths": 60,
    "interestRate": 5.9,
    "zipCode": "90001",
    "customerFico": 720,
    "customerMonthlyIncome": 5000
  }' | jq . || echo -e "${RED}Failed${NC}"

echo ""
echo ""
echo "Test 2: Get ML performance metrics"
echo "----------------------------------"
curl -X GET "${BASE_URL}/api/ml/performance" \
  -b cookies.txt | jq . || echo -e "${RED}Failed${NC}"

echo ""
echo ""
echo "Test 3: Record deal outcome (feedback)"
echo "--------------------------------------"
curl -X POST "${BASE_URL}/api/ml/feedback" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "dealId": "123e4567-e89b-12d3-a456-426614174000",
    "strategyKey": "high_down_payment",
    "success": true
  }' | jq . || echo -e "${RED}Failed${NC}"

echo ""
echo ""
echo "=================================="
echo "Tests complete!"
echo ""
echo "Note: To run these tests, first login and save cookies:"
echo "  curl -X POST ${BASE_URL}/api/login -H 'Content-Type: application/json' \\"
echo "    -d '{\"username\":\"your_username\",\"password\":\"your_password\"}' -c cookies.txt"
