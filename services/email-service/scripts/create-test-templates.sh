#!/bin/bash

# Script to create sample email templates for testing
# Usage: ./scripts/create-test-templates.sh

BASE_URL="${BASE_URL:-http://localhost:8004}"
DEALERSHIP_ID="${DEALERSHIP_ID:-dealer-123}"

echo "Creating sample email templates..."
echo "Base URL: $BASE_URL"
echo "Dealership ID: $DEALERSHIP_ID"
echo ""

# Template 1: Welcome Email
echo "Creating Welcome Email template..."
curl -X POST "$BASE_URL/email/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "'"$DEALERSHIP_ID"'",
    "name": "Welcome Email",
    "subject": "Welcome to {{dealership_name}}!",
    "body_html": "<html><body><h1>Welcome {{customer_name}}!</h1><p>Thank you for choosing {{dealership_name}}. We are excited to help you find your perfect vehicle.</p><p>Your sales representative {{salesperson_name}} will be in touch shortly.</p></body></html>"
  }' | jq '.'

echo ""
echo ""

# Template 2: Deal Confirmation
echo "Creating Deal Confirmation template..."
curl -X POST "$BASE_URL/email/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "'"$DEALERSHIP_ID"'",
    "name": "Deal Confirmation",
    "subject": "Your Deal {{deal_id}} is Confirmed!",
    "body_html": "<html><body><h1>Congratulations {{customer_name}}!</h1><p>Your deal for the following vehicle has been confirmed:</p><ul><li><strong>Vehicle:</strong> {{vehicle_info}}</li><li><strong>VIN:</strong> {{vehicle_vin}}</li><li><strong>Total Amount:</strong> {{deal_amount}}</li><li><strong>Monthly Payment:</strong> {{payment_amount}}</li></ul><p>Deal ID: {{deal_id}}</p><p>Please contact {{salesperson_name}} if you have any questions.</p></body></html>"
  }' | jq '.'

echo ""
echo ""

# Template 3: Appointment Reminder
echo "Creating Appointment Reminder template..."
curl -X POST "$BASE_URL/email/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "'"$DEALERSHIP_ID"'",
    "name": "Appointment Reminder",
    "subject": "Reminder: Your appointment on {{appointment_date}}",
    "body_html": "<html><body><h1>Appointment Reminder</h1><p>Hi {{customer_name}},</p><p>This is a friendly reminder about your upcoming appointment:</p><ul><li><strong>Date/Time:</strong> {{appointment_date}}</li><li><strong>Location:</strong> {{dealership_name}}</li><li><strong>Sales Rep:</strong> {{salesperson_name}}</li></ul><p>We look forward to seeing you!</p></body></html>"
  }' | jq '.'

echo ""
echo ""

# Template 4: Test Drive Follow-up
echo "Creating Test Drive Follow-up template..."
curl -X POST "$BASE_URL/email/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "'"$DEALERSHIP_ID"'",
    "name": "Test Drive Follow-up",
    "subject": "How was your test drive of {{vehicle_info}}?",
    "body_html": "<html><body><h1>Thank you for test driving!</h1><p>Hi {{customer_name}},</p><p>Thank you for taking the time to test drive the {{vehicle_info}}. We hope you enjoyed the experience!</p><p>If you have any questions or would like to schedule another visit, please contact {{salesperson_name}}.</p><p>We would love to hear your feedback!</p></body></html>"
  }' | jq '.'

echo ""
echo ""
echo "Sample templates created successfully!"
