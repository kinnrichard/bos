import { test, expect } from '@playwright/test';

test.describe('Sidebar Client Context', () => {
  test('should not show client section on homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    const sidebar = page.locator('.sidebar');

    // Check that no client section is visible
    const clientSection = sidebar.locator('.nav-item:has(.nav-link[href*="/clients/"])');
    await expect(clientSection).not.toBeVisible();

    // Check that footer logs section is not visible
    const footerNav = sidebar.locator('.footer-nav');
    await expect(footerNav).not.toBeVisible();
  });

  test('should show client section on job detail page', async ({ page }) => {
    // Navigate directly to a test job - use the first job UUID from test data
    // Note: This test relies on the test database having predictable data
    await page.goto('/jobs/0684c4a2-7467-48db-b6d6-9378b03b0a77');

    // Wait for the page to load completely and job data to be fetched
    await page.waitForTimeout(3000);

    const sidebar = page.locator('.sidebar');

    // Wait for the client section to appear (it loads after job data is fetched)
    const clientSection = sidebar.locator('.nav-item').filter({ hasText: 'Acme Corporation' });
    await expect(clientSection).toBeVisible({ timeout: 10000 });

    // Check that client name is displayed (should be "Acme Corporation" from test data)
    await expect(clientSection).toContainText('Acme Corporation');

    // Check that footer shows client's logs
    const footerNav = sidebar.locator('.footer-nav');
    await expect(footerNav).toBeVisible();
    await expect(footerNav).toContainText('Logs'); // Footer just shows "Logs" when client is selected
  });

  test('should show client section on client detail page', async ({ page }) => {
    // Navigate directly to a test client - use the first client UUID from test data
    // Note: This test relies on the test database having predictable data
    await page.goto('/clients/dd075772-460b-4964-9fad-7f6578b0122b');

    // Wait for the page to load completely
    await page.waitForTimeout(2000);

    const sidebar = page.locator('.sidebar');

    // Check that client section is visible - target the client link that ends with just the client ID
    const clientSection = sidebar.locator('.nav-item').filter({ hasText: 'Acme Corporation' });
    await expect(clientSection).toBeVisible();

    // Check that client name is displayed (should be "Acme Corporation" from test data)
    await expect(clientSection).toContainText('Acme Corporation');

    // Check that footer shows client's logs
    const footerNav = sidebar.locator('.footer-nav');
    await expect(footerNav).toBeVisible();
    await expect(footerNav).toContainText('Logs'); // Footer just shows "Logs" when client is selected
  });

  test('should not show client section on jobs listing page', async ({ page }) => {
    // Navigate to jobs listing
    await page.goto('/jobs');

    const sidebar = page.locator('.sidebar');

    // Check that no client section is visible
    const clientSection = sidebar.locator('.nav-item:has(.nav-link[href*="/clients/"])');
    await expect(clientSection).not.toBeVisible();

    // Check that footer logs section is not visible
    const footerNav = sidebar.locator('.footer-nav');
    await expect(footerNav).not.toBeVisible();
  });

  test('sidebar navigation should work correctly', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    const sidebar = page.locator('.sidebar');

    // Click on "Clients" (which links to /clients)
    await sidebar.locator('a:has-text("Clients")').click();
    await expect(page).toHaveURL('/clients');

    // Navigate back to homepage
    await sidebar.locator('.logo-link').click();
    await expect(page).toHaveURL('/');

    // Click on "Jobs"
    await sidebar.locator('a:has-text("Jobs")').click();
    await expect(page).toHaveURL('/jobs');
  });
});
