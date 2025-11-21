#!/bin/bash

# EMAIL MODULE INTEGRATION TEST SCRIPT
# Tests all email endpoints to ensure the new module is working correctly

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
SESSION_COOKIE=""

echo "================================================="
echo "EMAIL MODULE INTEGRATION TEST"
echo "================================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Function to print test result
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS:${NC} $2"
  else
    echo -e "${RED}✗ FAIL:${NC} $2"
    exit 1
  fi
}

test_warning() {
  echo -e "${YELLOW}⚠ WARNING:${NC} $1"
}

# Check if server is running
echo "Checking if server is running..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep -q "200\|404"; then
  test_result 0 "Server is running at $BASE_URL"
else
  test_result 1 "Server is not responding at $BASE_URL"
fi

echo ""
echo "================================================="
echo "AUTHENTICATION"
echo "================================================="

# You need to provide a valid session cookie
# For now, we'll skip auth tests and assume you're logged in via browser
test_warning "Authentication tests require manual login via browser"
test_warning "Please ensure you are logged in before running endpoint tests"

echo ""
echo "================================================="
echo "EMAIL ENDPOINT TESTS"
echo "================================================="

# Test 1: List emails (inbox)
echo ""
echo "Test 1: GET /api/email/messages?folder=inbox"
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "$BASE_URL/api/email/messages?folder=inbox")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "List inbox emails"
  echo "   Response: $(echo $BODY | jq -r '.data | length // 0') emails found"
elif [ "$HTTP_CODE" = "401" ]; then
  test_warning "Not authenticated - please login first"
  echo "   Run: curl -c cookies.txt -X POST $BASE_URL/api/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"your_password\"}'"
  exit 1
else
  test_result 1 "List inbox emails (HTTP $HTTP_CODE)"
fi

# Test 2: Get unread counts
echo ""
echo "Test 2: GET /api/email/unread-counts"
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "$BASE_URL/api/email/unread-counts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "Get unread counts"
  echo "   Inbox unread: $(echo $BODY | jq -r '.data.inbox // 0')"
else
  test_result 1 "Get unread counts (HTTP $HTTP_CODE)"
fi

# Test 3: Get email stats
echo ""
echo "Test 3: GET /api/email/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "$BASE_URL/api/email/stats")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "Get email statistics"
  echo "   Total emails: $(echo $BODY | jq -r '.data.total // 0')"
else
  test_result 1 "Get email statistics (HTTP $HTTP_CODE)"
fi

# Test 4: Get queue stats
echo ""
echo "Test 4: GET /api/email/queue/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "$BASE_URL/api/email/queue/stats")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "Get queue statistics"
  echo "   Queue size: $(echo $BODY | jq -r '.data.queueSize // 0')"
  echo "   Processing: $(echo $BODY | jq -r '.data.processing // false')"
else
  test_result 1 "Get queue statistics (HTTP $HTTP_CODE)"
fi

# Test 5: Send test email (commented out - requires valid email)
echo ""
echo "Test 5: POST /api/email/send (SKIPPED)"
test_warning "Send email test skipped - uncomment to test with real email"
# Uncomment and modify the following to test email sending:
# RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "$BASE_URL/api/email/send" \
#   -H 'Content-Type: application/json' \
#   -d '{
#     "to": [{"email": "'"$TEST_EMAIL"'", "name": "Test User"}],
#     "subject": "Email Module Integration Test",
#     "bodyText": "This is a test email from the new email module.",
#     "bodyHtml": "<p>This is a test email from the new email module.</p>"
#   }')
# HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
# BODY=$(echo "$RESPONSE" | head -n -1)
# if [ "$HTTP_CODE" = "200" ]; then
#   test_result 0 "Send test email"
#   echo "   Queue ID: $(echo $BODY | jq -r '.queueId // "N/A"')"
# else
#   test_result 1 "Send test email (HTTP $HTTP_CODE)"
# fi

# Test 6: Save draft (commented out - requires valid data)
echo ""
echo "Test 6: POST /api/email/drafts (SKIPPED)"
test_warning "Save draft test skipped - uncomment to test draft functionality"
# Uncomment to test:
# RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "$BASE_URL/api/email/drafts" \
#   -H 'Content-Type: application/json' \
#   -d '{
#     "to": [{"email": "'"$TEST_EMAIL"'"}],
#     "subject": "Test Draft",
#     "bodyText": "This is a test draft."
#   }')
# HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
# if [ "$HTTP_CODE" = "200" ]; then
#   test_result 0 "Save draft"
# else
#   test_result 1 "Save draft (HTTP $HTTP_CODE)"
# fi

# Test 7: List sent emails
echo ""
echo "Test 7: GET /api/email/messages?folder=sent"
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "$BASE_URL/api/email/messages?folder=sent")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "List sent emails"
  echo "   Response: $(echo $BODY | jq -r '.data | length // 0') emails found"
else
  test_result 1 "List sent emails (HTTP $HTTP_CODE)"
fi

# Test 8: List drafts
echo ""
echo "Test 8: GET /api/email/messages?folder=drafts"
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "$BASE_URL/api/email/messages?folder=drafts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "List draft emails"
  echo "   Response: $(echo $BODY | jq -r '.data | length // 0') drafts found"
else
  test_result 1 "List draft emails (HTTP $HTTP_CODE)"
fi

echo ""
echo "================================================="
echo "TEST SUMMARY"
echo "================================================="
echo ""
echo -e "${GREEN}Email module integration tests completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test email sending manually via the UI"
echo "2. Verify queue processing (check queue stats periodically)"
echo "3. Test inbound email webhooks (if configured)"
echo "4. Monitor server logs for any errors"
echo ""
echo "If all tests pass, the email module is ready for production!"
echo ""
