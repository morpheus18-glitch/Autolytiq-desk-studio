#!/bin/bash
# Customer API Integration Test Script
# Tests all customer module endpoints

BASE_URL="http://localhost:5000"
AUTH_TOKEN=""

echo "=========================================="
echo "Customer Module API Integration Tests"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5

    echo -n "Testing: $description... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "Cookie: $AUTH_TOKEN" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "Cookie: $AUTH_TOKEN" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    status=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
        PASSED=$((PASSED + 1))

        # Save response for later tests
        if [ "$description" = "Create customer" ]; then
            CUSTOMER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            echo "  → Created customer ID: $CUSTOMER_ID"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

echo "Step 1: Login to get authentication"
echo "======================================"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "password": "admin123"
    }' \
    -c cookies.txt \
    "$BASE_URL/api/login")

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)
if [ "$LOGIN_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    AUTH_TOKEN=$(cat cookies.txt | grep -v "^#" | awk '{print $6"="$7}')
    echo "  → Auth token obtained"
else
    echo -e "${RED}✗ Login failed (HTTP $LOGIN_STATUS)${NC}"
    echo "Please ensure:"
    echo "  1. Server is running on port 5000"
    echo "  2. Admin user exists (username: admin, password: admin123)"
    echo "  3. Database is accessible"
    exit 1
fi
echo ""

echo "Step 2: Test Customer Module Endpoints"
echo "======================================"

# Test 1: Create Customer
test_endpoint "POST" "/api/customers" \
    '{
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+15551234567",
        "status": "lead",
        "address": {
            "street": "123 Main St",
            "city": "Springfield",
            "state": "IL",
            "zipCode": "62701"
        }
    }' \
    "201" \
    "Create customer"

# Save customer ID for subsequent tests
if [ -z "$CUSTOMER_ID" ]; then
    echo -e "${RED}✗ Cannot proceed without customer ID${NC}"
    exit 1
fi

# Test 2: Get Customer by ID
test_endpoint "GET" "/api/customers/$CUSTOMER_ID" "" "200" "Get customer by ID"

# Test 3: List Customers
test_endpoint "GET" "/api/customers?page=1&limit=20" "" "200" "List customers"

# Test 4: Search Customers
test_endpoint "GET" "/api/customers/search?q=john" "" "200" "Search customers"

# Test 5: Update Customer
test_endpoint "PATCH" "/api/customers/$CUSTOMER_ID" \
    '{
        "status": "active",
        "notes": "Test customer - updated"
    }' \
    "200" \
    "Update customer"

# Test 6: Get Customer Timeline
test_endpoint "GET" "/api/customers/$CUSTOMER_ID/timeline" "" "200" "Get customer timeline"

# Test 7: Get Customer Deals
test_endpoint "GET" "/api/customers/$CUSTOMER_ID/deals" "" "200" "Get customer deals"

# Test 8: Get Customer Emails
test_endpoint "GET" "/api/customers/$CUSTOMER_ID/emails" "" "200" "Get customer emails"

# Test 9: Find Duplicates
test_endpoint "POST" "/api/customers/find-duplicates" \
    '{
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
    }' \
    "200" \
    "Find duplicate customers"

# Test 10: Validate Customer Data
test_endpoint "POST" "/api/customers/validate" \
    '{
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
    }' \
    "200" \
    "Validate customer data"

# Test 11: Delete Customer (Soft Delete)
test_endpoint "DELETE" "/api/customers/$CUSTOMER_ID" "" "204" "Delete customer (soft)"

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

# Cleanup
rm -f cookies.txt

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
