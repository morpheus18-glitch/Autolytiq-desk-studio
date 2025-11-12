// Email configuration for Autolytiq platform
// This will be used when integrating an email service (e.g., SendGrid, AWS SES, Resend)

export const emailConfig = {
  // Sender email address for all system emails
  from: "support@autolytiq.com",
  fromName: "Autolytiq Support",
  
  // Email templates
  templates: {
    passwordReset: {
      subject: "Reset Your Autolytiq Password",
      // Template will be implemented when email service is added
    },
    registration: {
      subject: "Welcome to Autolytiq",
      // Template will be implemented when email service is added
    },
    emailVerification: {
      subject: "Verify Your Autolytiq Email",
      // Template will be implemented when email service is added
    },
    twoFactorSetup: {
      subject: "Two-Factor Authentication Setup",
      // Template will be implemented when email service is added
    },
  },
};

// Placeholder email sending function
// TODO: Replace with actual email service integration (SendGrid, AWS SES, Resend, etc.)
export async function sendEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 EMAIL (Not sent - email service not configured)");
  console.log(`From: ${emailConfig.fromName} <${emailConfig.from}>`);
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  if (options.text) {
    console.log(`\nBody:\n${options.text}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // In production, this would actually send the email via your chosen service
  // Example with SendGrid:
  // await sgMail.send({ from: emailConfig.from, ...options });
}
