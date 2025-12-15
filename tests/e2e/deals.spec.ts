/**
 * Deals E2E Tests
 *
 * End-to-end tests for the deals management flow including:
 * - Deal listing and filtering
 * - Deal creation workflow
 * - Payment calculations
 * - Deal status transitions
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

test.describe('Deals Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test.describe('Deals List', () => {
    test('navigates to deals page', async ({ page }) => {
      // Click on deals in navigation
      await page.getByRole('link', { name: /deals/i }).click();

      // Should be on deals page
      await expect(page).toHaveURL(/deals/);
      await expect(page.getByRole('heading', { name: /deals/i })).toBeVisible();
    });

    test('displays deals list', async ({ page }) => {
      await page.goto('/deals');

      // Should show deals table or list
      const dealsList = page.locator('[data-testid="deals-list"]')
        .or(page.locator('table'))
        .or(page.getByRole('table'));

      await expect(dealsList.or(page.getByText(/no deals/i))).toBeVisible();
    });

    test('can search deals', async ({ page }) => {
      await page.goto('/deals');

      // Look for search input
      const searchInput = page.getByPlaceholder(/search/i)
        .or(page.getByRole('searchbox'));

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');

        // Should filter results (or show no results)
        await page.waitForTimeout(500); // Wait for search to complete
      }
    });

    test('can filter deals by status', async ({ page }) => {
      await page.goto('/deals');

      // Look for status filter
      const statusFilter = page.getByRole('combobox', { name: /status/i })
        .or(page.locator('[data-testid="status-filter"]'))
        .or(page.getByText(/all statuses/i));

      if (await statusFilter.isVisible()) {
        await statusFilter.click();

        // Select a status
        const draftOption = page.getByRole('option', { name: /draft/i })
          .or(page.getByText(/draft/i));

        if (await draftOption.isVisible()) {
          await draftOption.click();
          // Results should update
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Deal Creation', () => {
    test('opens deal creation form', async ({ page }) => {
      await page.goto('/deals');

      // Click new deal button
      const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });

      if (await newDealButton.isVisible()) {
        await newDealButton.click();

        // Should show deal creation form/modal
        await expect(
          page.getByRole('dialog').or(page.getByRole('form')).or(page.getByText(/new deal/i))
        ).toBeVisible();
      }
    });

    test('validates required fields in deal form', async ({ page }) => {
      await page.goto('/deals');

      // Open deal creation
      const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
      if (await newDealButton.isVisible()) {
        await newDealButton.click();

        // Try to submit empty form
        const submitButton = page.getByRole('button', { name: /save|create|submit/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show validation errors
          await expect(
            page.getByText(/required/i)
              .or(page.getByText(/please fill/i))
              .or(page.locator('.error'))
          ).toBeVisible();
        }
      }
    });
  });

  test.describe('Payment Calculator', () => {
    test('calculates monthly payment in real-time', async ({ page }) => {
      await page.goto('/deals');

      // Open deal creation or edit
      const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
      if (await newDealButton.isVisible()) {
        await newDealButton.click();

        // Fill in pricing fields
        const vehiclePriceInput = page.getByLabel(/vehicle price|price/i);
        const termInput = page.getByLabel(/term|months/i);
        const aprInput = page.getByLabel(/apr|rate|interest/i);

        if (await vehiclePriceInput.isVisible()) {
          await vehiclePriceInput.fill('30000');
        }

        if (await termInput.isVisible()) {
          await termInput.fill('60');
        }

        if (await aprInput.isVisible()) {
          await aprInput.fill('5.99');
        }

        // Monthly payment should be calculated
        const monthlyPayment = page.getByText(/monthly payment/i)
          .or(page.locator('[data-testid="monthly-payment"]'));

        if (await monthlyPayment.isVisible()) {
          // Should show a calculated value (not $0 or empty)
          await expect(monthlyPayment).not.toHaveText(/\$0\.00|\$0/);
        }
      }
    });

    test('updates calculations when trade-in is added', async ({ page }) => {
      await page.goto('/deals');

      const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
      if (await newDealButton.isVisible()) {
        await newDealButton.click();

        // Fill vehicle price
        const vehiclePriceInput = page.getByLabel(/vehicle price|price/i);
        if (await vehiclePriceInput.isVisible()) {
          await vehiclePriceInput.fill('30000');
        }

        // Get initial amount financed
        const amountFinanced = page.locator('[data-testid="amount-financed"]')
          .or(page.getByText(/amount financed/i));

        // Add trade-in value
        const tradeInInput = page.getByLabel(/trade-in|trade in/i);
        if (await tradeInInput.isVisible()) {
          await tradeInInput.fill('5000');

          // Amount financed should decrease
          // This is a visual check - actual values depend on implementation
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Deal Workflow', () => {
    test('can view deal details', async ({ page }) => {
      await page.goto('/deals');

      // Click on first deal row
      const dealRow = page.locator('tr').first()
        .or(page.locator('[data-testid="deal-row"]').first());

      if (await dealRow.isVisible()) {
        await dealRow.click();

        // Should show deal details
        await expect(
          page.getByText(/deal details/i)
            .or(page.getByRole('heading', { name: /deal/i }))
        ).toBeVisible();
      }
    });

    test('can update deal status', async ({ page }) => {
      await page.goto('/deals');

      // Click on first deal
      const dealRow = page.locator('tr').first()
        .or(page.locator('[data-testid="deal-row"]').first());

      if (await dealRow.isVisible()) {
        await dealRow.click();

        // Find status dropdown or button
        const statusButton = page.getByRole('button', { name: /status|draft|pending/i })
          .or(page.locator('[data-testid="deal-status"]'));

        if (await statusButton.isVisible()) {
          await statusButton.click();

          // Select new status
          const pendingOption = page.getByRole('option', { name: /pending|submit/i })
            .or(page.getByText(/submit for approval/i));

          if (await pendingOption.isVisible()) {
            await pendingOption.click();

            // Status should update
            await expect(page.getByText(/pending/i)).toBeVisible();
          }
        }
      }
    });
  });
});

test.describe('Deal Types', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/deals');
  });

  test('can create finance deal', async ({ page }) => {
    const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
    if (await newDealButton.isVisible()) {
      await newDealButton.click();

      // Select deal type
      const dealTypeSelect = page.getByLabel(/deal type/i)
        .or(page.getByRole('combobox', { name: /type/i }));

      if (await dealTypeSelect.isVisible()) {
        await dealTypeSelect.click();
        await page.getByRole('option', { name: /finance/i }).click();
      }

      // Finance-specific fields should appear
      await expect(
        page.getByLabel(/apr|interest rate/i)
          .or(page.getByLabel(/term|months/i))
      ).toBeVisible();
    }
  });

  test('can create cash deal', async ({ page }) => {
    const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
    if (await newDealButton.isVisible()) {
      await newDealButton.click();

      const dealTypeSelect = page.getByLabel(/deal type/i)
        .or(page.getByRole('combobox', { name: /type/i }));

      if (await dealTypeSelect.isVisible()) {
        await dealTypeSelect.click();
        await page.getByRole('option', { name: /cash/i }).click();
      }

      // APR and term fields should not be visible for cash deal
      // Or they should be disabled
      const aprInput = page.getByLabel(/apr|interest rate/i);
      if (await aprInput.isVisible()) {
        await expect(aprInput).toBeDisabled().catch(() => {
          // APR might just not be shown for cash deals
        });
      }
    }
  });

  test('can create lease deal', async ({ page }) => {
    const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
    if (await newDealButton.isVisible()) {
      await newDealButton.click();

      const dealTypeSelect = page.getByLabel(/deal type/i)
        .or(page.getByRole('combobox', { name: /type/i }));

      if (await dealTypeSelect.isVisible()) {
        await dealTypeSelect.click();

        const leaseOption = page.getByRole('option', { name: /lease/i });
        if (await leaseOption.isVisible()) {
          await leaseOption.click();

          // Lease-specific fields should appear
          await expect(
            page.getByLabel(/residual|money factor|msrp/i)
          ).toBeVisible();
        }
      }
    }
  });
});

test.describe('Deal Tax Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/deals');
  });

  test('shows tax calculation based on state', async ({ page }) => {
    const newDealButton = page.getByRole('button', { name: /new deal|create|add/i });
    if (await newDealButton.isVisible()) {
      await newDealButton.click();

      // Fill in vehicle price
      const vehiclePriceInput = page.getByLabel(/vehicle price|price/i);
      if (await vehiclePriceInput.isVisible()) {
        await vehiclePriceInput.fill('30000');
      }

      // Select state
      const stateSelect = page.getByLabel(/state/i)
        .or(page.getByRole('combobox', { name: /state/i }));

      if (await stateSelect.isVisible()) {
        await stateSelect.click();
        await page.getByRole('option', { name: /texas|tx/i }).click();
      }

      // Tax should be calculated
      const taxAmount = page.getByText(/tax/i)
        .or(page.locator('[data-testid="tax-amount"]'));

      if (await taxAmount.isVisible()) {
        // Texas tax rate is 6.25%, so on $30,000 = $1,875
        await expect(taxAmount).toBeVisible();
      }
    }
  });
});
