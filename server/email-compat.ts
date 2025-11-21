/**
 * EMAIL COMPATIBILITY SHIM
 *
 * This module provides backward compatibility for code that still uses the old email system.
 * It wraps the new email module's API to match the old email-config.ts interface.
 *
 * TEMPORARY: This file should be removed once all imports are migrated to use the new module directly.
 */

import emailModule from '../src/modules/email/index';

/**
 * Get the verified FROM email address
 * Wraps the new module's getVerifiedFromEmail function
 */
export async function getVerifiedFromEmail(): Promise<string> {
  try {
    return await emailModule.getVerifiedFromEmail();
  } catch (error) {
    console.error('[EmailCompat] Failed to get verified FROM email:', error);
    return 'support@autolytiq.com'; // Fallback
  }
}

/**
 * Send email (compatibility wrapper)
 * Maps old sendEmail signature to new module's sendEmail
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<void> {
  try {
    // Get tenant and user context (fallback for system emails)
    const tenantId = 'default'; // System emails don't have tenant context
    const userId = 'system'; // System user for automated emails

    // Map old options to new SendEmailRequest format
    await emailModule.sendEmail(tenantId, userId, {
      to: [{ email: options.to }],
      subject: options.subject,
      bodyHtml: options.html,
      bodyText: options.text,
    });
  } catch (error) {
    console.error('[EmailCompat] Failed to send email:', error);
    throw error;
  }
}

/**
 * Generate password reset email content
 */
export function generatePasswordResetEmail(options: {
  fullName: string;
  resetLink: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, resetLink } = options;

  const subject = 'Reset Your Autolytiq Password';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f7fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${fullName},</p>
          <p>We received a request to reset your password for your Autolytiq account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
          <p>For security reasons, never share this link with anyone.</p>
          <div class="footer">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${fullName},

We received a request to reset your password for your Autolytiq account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email. Your password will remain unchanged.

For security reasons, never share this link with anyone.

- The Autolytiq Team
  `;

  return { subject, html, text };
}

/**
 * Generate welcome email content
 */
export function generateWelcomeEmail(options: {
  fullName: string;
  username: string;
  loginUrl: string;
  temporaryPassword?: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { fullName, username, loginUrl, temporaryPassword } = options;

  const subject = 'Welcome to Autolytiq';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f7fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .credentials {
            background: #fff;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Autolytiq!</h1>
        </div>
        <div class="content">
          <p>Hi ${fullName},</p>
          <p>Your Autolytiq account has been created successfully!</p>
          <div class="credentials">
            <p><strong>Your login credentials:</strong></p>
            <p>Username: <strong>${username}</strong></p>
            ${temporaryPassword ? `<p>Temporary Password: <strong>${temporaryPassword}</strong></p>` : ''}
          </div>
          ${temporaryPassword ? '<p><strong>Important:</strong> Please change your password after your first login.</p>' : ''}
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login to Autolytiq</a>
          </p>
          <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${fullName},

Welcome to Autolytiq! Your account has been created successfully.

Your login credentials:
Username: ${username}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}

${temporaryPassword ? 'Important: Please change your password after your first login.' : ''}

Login here: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

- The Autolytiq Team
  `;

  return { subject, html, text };
}
