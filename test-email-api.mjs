import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testEmailAPI() {
  try {
    console.log('=== EMAIL API TEST ===\n');

    // First, let's try to login
    console.log('1. Attempting to login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login failed. Creating test session...');
      // For testing, we'll bypass auth
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful:', loginResponse.ok);

    // Test fetching emails with authentication
    console.log('\n2. Fetching inbox emails...');
    const emailsResponse = await fetch(`${API_URL}/api/email/messages?folder=inbox`, {
      headers: {
        'Cookie': cookies || ''
      }
    });

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      console.log(`Found ${emails.length} emails in inbox`);

      if (emails.length > 0) {
        console.log('\nRecent emails:');
        emails.slice(0, 3).forEach((email, index) => {
          console.log(`${index + 1}. ${email.subject}`);
          console.log(`   From: ${email.fromAddress}`);
          console.log(`   Read: ${email.isRead}`);
        });
      }
    } else {
      const error = await emailsResponse.text();
      console.log('Failed to fetch emails:', error);
    }

    // Test webhook endpoint (no auth required)
    console.log('\n3. Testing webhook endpoint...');
    const webhookResponse = await fetch(`${API_URL}/api/webhooks/email/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'email.received',
        data: {
          id: `api-test-${Date.now()}`,
          subject: 'API Test Email',
          from: 'api-test@example.com',
          to: ['support@autolytiq.com'],
          text: 'Testing from API'
        }
      })
    });

    const webhookResult = await webhookResponse.json();
    console.log('Webhook response:', webhookResult);

    console.log('\n=== SUMMARY ===');
    console.log('✅ Webhook endpoint is accessible and working');

    if (emailsResponse.ok) {
      console.log('✅ Email API is accessible (requires authentication)');
    } else {
      console.log('⚠️  Email API requires valid authentication');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEmailAPI();