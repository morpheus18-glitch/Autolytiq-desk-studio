#!/bin/bash

# Script to create the password reset email template
# Usage: ./scripts/create-password-reset-template.sh

BASE_URL="${BASE_URL:-http://localhost:8004}"
DEALERSHIP_ID="${DEALERSHIP_ID:-system}"

echo "Creating Password Reset Email template..."
echo "Base URL: $BASE_URL"
echo "Dealership ID: $DEALERSHIP_ID"
echo ""

# Password Reset Template
curl -X POST "$BASE_URL/email/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": "'"$DEALERSHIP_ID"'",
    "name": "Password Reset",
    "subject": "Reset Your Autolytiq Password",
    "body_html": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><style>body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; } .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; } .content { background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; } .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; } .footer { text-align: center; padding: 20px; color: #657786; font-size: 14px; } .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; } </style></head><body><div class=\"header\"><h1>Password Reset Request</h1></div><div class=\"content\"><p>Hi {{user_name}},</p><p>We received a request to reset your Autolytiq password. Click the button below to create a new password:</p><p style=\"text-align: center;\"><a href=\"{{reset_url}}\" class=\"button\">Reset Password</a></p><p>Or copy and paste this link into your browser:</p><p style=\"word-break: break-all; color: #667eea;\">{{reset_url}}</p><div class=\"warning\"><strong>Security Note:</strong> This link will expire in 1 hour. If you didn\\'t request this password reset, you can safely ignore this email.</div><p>If you have any questions, please contact your dealership administrator.</p><p>Best regards,<br><strong>Autolytiq Team</strong></p></div><div class=\"footer\"><p>&copy; 2024 Autolytiq. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></body></html>"
  }' | jq '.'

echo ""
echo "Password reset template created successfully!"
echo ""
echo "Template ID: password-reset"
echo "Dealership ID: $DEALERSHIP_ID"
