// Email configuration for Autolytiq platform
// Integrated with Resend for transactional email delivery

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

export const emailConfig = {
  // Sender email address for all system emails
  from: "support@autolytiq.com",
  fromName: "Autolytiq Support",
  
  // Email templates
  templates: {
    passwordReset: {
      subject: "Reset Your Autolytiq Password",
    },
    registration: {
      subject: "Welcome to Autolytiq",
    },
    emailVerification: {
      subject: "Verify Your Autolytiq Email",
    },
    twoFactorSetup: {
      subject: "Two-Factor Authentication Setup",
    },
  },
};

// Send email via Resend
export async function sendEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    // Use the configured from email from Resend connection, or fall back to our default
    const finalFromEmail = fromEmail || emailConfig.from;
    
    const emailPayload: any = {
      from: `${emailConfig.fromName} <${finalFromEmail}>`,
      to: options.to,
      subject: options.subject,
    };
    
    // Add html or text if provided
    if (options.html) {
      emailPayload.html = options.html;
    }
    if (options.text) {
      emailPayload.text = options.text;
    }
    
    const result = await client.emails.send(emailPayload);

    console.log("✅ Email sent successfully via Resend");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("Full Resend response:", JSON.stringify(result, null, 2));
    
    // Check if email actually sent
    if (result.error) {
      console.error("❌ Resend API returned an error:", result.error);
      throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error);
    
    // SECURITY: Only log metadata, never the email body (contains reset tokens, sensitive data)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 EMAIL FAILED TO SEND");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("Body: [REDACTED - contains sensitive information]");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    throw error;
  }
}

// Helper function to generate password reset email HTML
export function generatePasswordResetEmail(resetUrl: string) {
  return {
    subject: emailConfig.templates.passwordReset.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Autolytiq</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            
            <p style="font-size: 16px; color: #555;">
              You requested to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 14px 32px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600; 
                        display: inline-block;
                        font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #777;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="font-size: 14px; color: #777;">
              If you didn't request this, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              ${emailConfig.fromName}<br>
              This is an automated email, please do not reply.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Reset Your Password

You requested to reset your password for your Autolytiq account.

Click this link to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this, you can safely ignore this email.

---
${emailConfig.fromName}
This is an automated email, please do not reply.
    `.trim(),
  };
}

// Helper function to generate welcome email for new users
export function generateWelcomeEmail(options: {
  fullName: string;
  username: string;
  password: string;
  loginUrl: string;
}) {
  const { fullName, username, password, loginUrl } = options;
  
  return {
    subject: emailConfig.templates.registration.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Autolytiq</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Autolytiq</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Welcome to Autolytiq!</h2>
            
            <p style="font-size: 16px; color: #555;">
              Hi ${fullName},
            </p>
            
            <p style="font-size: 16px; color: #555;">
              Your Autolytiq account has been created. Here are your login credentials:
            </p>
            
            <div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                <strong>Username:</strong>
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; font-family: monospace;">
                ${username}
              </p>
              
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                <strong>Password:</strong>
              </p>
              <p style="margin: 0; font-size: 16px; color: #333; font-family: monospace;">
                ${password}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 14px 32px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600; 
                        display: inline-block;
                        font-size: 16px;">
                Log In Now
              </a>
            </div>
            
            <p style="font-size: 14px; color: #777;">
              For security, we recommend changing your password after your first login.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              ${emailConfig.fromName}<br>
              This is an automated email, please do not reply.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Autolytiq!

Hi ${fullName},

Your Autolytiq account has been created. Here are your login credentials:

Username: ${username}
Password: ${password}

Log in at: ${loginUrl}

For security, we recommend changing your password after your first login.

---
${emailConfig.fromName}
This is an automated email, please do not reply.
    `.trim(),
  };
}
