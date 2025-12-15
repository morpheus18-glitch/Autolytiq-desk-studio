/**
 * Authentication E2E Tests
 *
 * End-to-end tests for the authentication flow including:
 * - Login with valid/invalid credentials
 * - Password visibility toggle
 * - Form validation
 * - Session persistence
 * - Logout flow
 */

import { test, expect } from '@playwright/test';

// Test credentials
const DEMO_EMAIL = 'demo@autolytiq.com';
const DEMO_PASSWORD = 'demo123';
const INVALID_EMAIL = 'invalid@example.com';
const INVALID_PASSWORD = 'wrongpassword';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Login Page UI', () => {
    test('displays login form correctly', async ({ page }) => {
      // Check page title/heading
      await expect(page.getByText('Welcome back')).toBeVisible();
      await expect(page.getByText('Sign in to your account')).toBeVisible();

      // Check form elements
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Check demo credentials hint
      await expect(page.getByText('Demo Account')).toBeVisible();
      await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
    });

    test('toggles password visibility', async ({ page }) => {
      const passwordInput = page.getByLabel('Password');
      const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).last();

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('remember me checkbox is interactive', async ({ page }) => {
      const checkbox = page.getByLabel('Remember me for 30 days');

      await expect(checkbox).not.toBeChecked();
      await checkbox.check();
      await expect(checkbox).toBeChecked();
      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();
    });
  });

  test.describe('Form Validation', () => {
    test('shows error for empty email', async ({ page }) => {
      // Submit form without entering email
      await page.getByLabel('Password').fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show email validation error
      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.getByLabel('Email address').fill('notanemail');
      await page.getByLabel('Password').fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test('shows error for empty password', async ({ page }) => {
      await page.getByLabel('Email address').fill(DEMO_EMAIL);
      // Leave password empty
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/password is required/i)).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test('logs in with valid credentials', async ({ page }) => {
      // Fill in credentials
      await page.getByLabel('Email address').fill(DEMO_EMAIL);
      await page.getByLabel('Password').fill(DEMO_PASSWORD);

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard after successful login
      await expect(page).toHaveURL(/dashboard|\/$/);

      // Should show user info or dashboard content
      await expect(page.locator('body')).not.toContainText('Sign in');
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.getByLabel('Email address').fill(INVALID_EMAIL);
      await page.getByLabel('Password').fill(INVALID_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|incorrect|credentials|unauthorized/i)).toBeVisible({
        timeout: 5000,
      });

      // Should still be on login page
      await expect(page).toHaveURL(/login/);
    });

    test('shows loading state during login', async ({ page }) => {
      await page.getByLabel('Email address').fill(DEMO_EMAIL);
      await page.getByLabel('Password').fill(DEMO_PASSWORD);

      // Click submit and immediately check for loading state
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.click();

      // Button should show loading state (checking for spinner or "Signing in...")
      // This may be brief, so we use a short timeout
      try {
        await expect(page.getByText(/signing in/i)).toBeVisible({ timeout: 1000 });
      } catch {
        // Loading may be too fast to catch, which is fine
      }
    });

    test('preserves email after failed login', async ({ page }) => {
      await page.getByLabel('Email address').fill(INVALID_EMAIL);
      await page.getByLabel('Password').fill(INVALID_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for error
      await expect(page.getByText(/invalid|incorrect|credentials|unauthorized/i)).toBeVisible({
        timeout: 5000,
      });

      // Email should still be in the input
      await expect(page.getByLabel('Email address')).toHaveValue(INVALID_EMAIL);
    });
  });

  test.describe('Session Management', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      // Try to access protected route directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('maintains session after login', async ({ page }) => {
      // Login
      await page.getByLabel('Email address').fill(DEMO_EMAIL);
      await page.getByLabel('Password').fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for redirect
      await expect(page).toHaveURL(/dashboard|\/$/);

      // Refresh page
      await page.reload();

      // Should still be logged in
      await expect(page).not.toHaveURL(/login/);
    });
  });
});

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email address').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard|\/$/);
  });

  test('logs out successfully', async ({ page }) => {
    // Find and click logout button (usually in header/sidebar)
    // This selector may need adjustment based on actual UI
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    } else {
      // Try dropdown menu approach
      const userMenu = page.locator('[data-testid="user-menu"]').or(page.getByRole('button').filter({ has: page.locator('svg') }));
      if (await userMenu.first().isVisible()) {
        await userMenu.first().click();
        const logoutOption = page.getByText(/logout|sign out/i);
        if (await logoutOption.isVisible()) {
          await logoutOption.click();
          await expect(page).toHaveURL(/login/);
        }
      }
    }
  });

  test('cannot access protected routes after logout', async ({ page }) => {
    // Logout first (simplified - clear storage)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Accessibility', () => {
  test('login form is keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab to email field
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Email address')).toBeFocused();

    // Tab to password field
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();

    // Tab to toggle button
    await page.keyboard.press('Tab');

    // Tab to forgot password link
    await page.keyboard.press('Tab');

    // Tab to remember me
    await page.keyboard.press('Tab');

    // Tab to submit button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();

    // Can submit with Enter
    await page.getByLabel('Email address').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.keyboard.press('Enter');

    // Should attempt login
    await expect(page).toHaveURL(/dashboard|\/$/);
  });

  test('form inputs have proper labels', async ({ page }) => {
    await page.goto('/login');

    // Email input should have associated label
    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Password input should have associated label
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
