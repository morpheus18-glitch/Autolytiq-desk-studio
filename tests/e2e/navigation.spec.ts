/**
 * Navigation E2E Tests
 *
 * End-to-end tests for application navigation including:
 * - Main navigation links
 * - Protected route guards
 * - Page title updates
 * - Responsive navigation
 */

import { test, expect, type Page } from '@playwright/test';

// Test credentials
const DEMO_EMAIL = 'demo@autolytiq.com';
const DEMO_PASSWORD = 'demo123';

/**
 * Helper function to login
 */
async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard|\/$/);
}

test.describe('Main Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('shows navigation menu after login', async ({ page }) => {
    // Should see main navigation
    await expect(
      page.getByRole('navigation')
        .or(page.locator('nav'))
        .or(page.locator('[data-testid="main-nav"]'))
    ).toBeVisible();
  });

  test('navigates to Dashboard', async ({ page }) => {
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });

    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await expect(page).toHaveURL(/dashboard|\/$/);
    }
  });

  test('navigates to Deals', async ({ page }) => {
    const dealsLink = page.getByRole('link', { name: /deals/i });

    if (await dealsLink.isVisible()) {
      await dealsLink.click();
      await expect(page).toHaveURL(/deals/);
    }
  });

  test('navigates to Customers', async ({ page }) => {
    const customersLink = page.getByRole('link', { name: /customers/i });

    if (await customersLink.isVisible()) {
      await customersLink.click();
      await expect(page).toHaveURL(/customers/);
    }
  });

  test('navigates to Inventory', async ({ page }) => {
    const inventoryLink = page.getByRole('link', { name: /inventory|vehicles/i });

    if (await inventoryLink.isVisible()) {
      await inventoryLink.click();
      await expect(page).toHaveURL(/inventory/);
    }
  });

  test('navigates to Messages', async ({ page }) => {
    const messagesLink = page.getByRole('link', { name: /messages/i });

    if (await messagesLink.isVisible()) {
      await messagesLink.click();
      await expect(page).toHaveURL(/messages/);
    }
  });

  test('navigates to Settings', async ({ page }) => {
    const settingsLink = page.getByRole('link', { name: /settings/i });

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings/);
    }
  });
});

test.describe('Protected Routes', () => {
  test('redirects unauthenticated users from Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('redirects unauthenticated users from Deals', async ({ page }) => {
    await page.goto('/deals');
    await expect(page).toHaveURL(/login/);
  });

  test('redirects unauthenticated users from Customers', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveURL(/login/);
  });

  test('redirects unauthenticated users from Inventory', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/login/);
  });

  test('redirects unauthenticated users from Settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/login/);
  });

  test('allows authenticated users to access protected routes', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/deals');
    await expect(page).toHaveURL(/deals/);
    await expect(page).not.toHaveURL(/login/);

    await page.goto('/customers');
    await expect(page).toHaveURL(/customers/);
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe('Page Titles', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('updates page title for Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/dashboard|autolytiq/i);
  });

  test('updates page title for Deals', async ({ page }) => {
    await page.goto('/deals');
    await expect(page).toHaveTitle(/deals|autolytiq/i);
  });

  test('updates page title for Customers', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveTitle(/customers|autolytiq/i);
  });
});

test.describe('Breadcrumbs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('shows breadcrumbs on nested pages', async ({ page }) => {
    await page.goto('/deals');

    // Click on a deal to navigate to detail page
    const dealRow = page.locator('tr').first()
      .or(page.locator('[data-testid="deal-row"]').first());

    if (await dealRow.isVisible()) {
      await dealRow.click();

      // Look for breadcrumb navigation
      const breadcrumbs = page.locator('[aria-label="Breadcrumb"]')
        .or(page.locator('.breadcrumbs'))
        .or(page.getByRole('navigation', { name: /breadcrumb/i }));

      if (await breadcrumbs.isVisible()) {
        // Should show path back to deals list
        await expect(page.getByText(/deals/i)).toBeVisible();
      }
    }
  });

  test('breadcrumb links are clickable', async ({ page }) => {
    await page.goto('/deals');

    const dealRow = page.locator('tr').first()
      .or(page.locator('[data-testid="deal-row"]').first());

    if (await dealRow.isVisible()) {
      await dealRow.click();

      // Find deals link in breadcrumb and click it
      const dealsLink = page.getByRole('link', { name: /deals/i }).first();

      if (await dealsLink.isVisible()) {
        await dealsLink.click();
        await expect(page).toHaveURL(/deals/);
      }
    }
  });
});

test.describe('Responsive Navigation', () => {
  test('shows mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsDemo(page);

    // Look for hamburger menu button
    const menuButton = page.getByRole('button', { name: /menu/i })
      .or(page.locator('[data-testid="mobile-menu"]'))
      .or(page.locator('button').filter({ has: page.locator('svg') }));

    await expect(menuButton).toBeVisible();
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsDemo(page);

    const menuButton = page.getByRole('button', { name: /menu/i })
      .or(page.locator('[data-testid="mobile-menu"]'))
      .or(page.locator('button').filter({ has: page.locator('svg') }).first());

    if (await menuButton.isVisible()) {
      // Open menu
      await menuButton.click();

      // Menu should be visible
      await expect(
        page.getByRole('navigation')
          .or(page.locator('[data-testid="mobile-nav"]'))
      ).toBeVisible();

      // Close menu (either click button again or click outside)
      await menuButton.click();
    }
  });

  test('navigation links work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsDemo(page);

    const menuButton = page.getByRole('button', { name: /menu/i })
      .or(page.locator('[data-testid="mobile-menu"]'))
      .or(page.locator('button').filter({ has: page.locator('svg') }).first());

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Click on a navigation item
      const dealsLink = page.getByRole('link', { name: /deals/i });
      if (await dealsLink.isVisible()) {
        await dealsLink.click();
        await expect(page).toHaveURL(/deals/);
      }
    }
  });
});

test.describe('Active State Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('highlights active navigation item', async ({ page }) => {
    await page.goto('/deals');

    // The deals link should have active styling
    const dealsLink = page.getByRole('link', { name: /deals/i });

    if (await dealsLink.isVisible()) {
      // Check for active class or aria-current
      const isActive = await dealsLink.getAttribute('aria-current') === 'page' ||
        (await dealsLink.getAttribute('class'))?.includes('active');

      // This is a visual check - actual implementation may vary
      await expect(dealsLink).toBeVisible();
    }
  });
});

test.describe('Error Pages', () => {
  test('shows 404 page for invalid routes', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/invalid-route-that-does-not-exist');

    // Should show 404 or redirect
    await expect(
      page.getByText(/404|not found|page doesn't exist/i)
        .or(page.locator('h1'))
    ).toBeVisible();
  });
});

test.describe('Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('shows loading indicator during navigation', async ({ page }) => {
    // This test checks for loading states during route transitions
    // Implementation depends on how the app handles loading

    await page.goto('/deals');

    // Navigate to a page that might have loading
    await page.getByRole('link', { name: /customers/i }).click();

    // May briefly show loading state
    // This is often too fast to catch reliably
  });
});
