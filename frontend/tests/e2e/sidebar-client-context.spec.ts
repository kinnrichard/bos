import { test, expect } from '@playwright/test';

test.describe('Sidebar Client Context', () => {
  test('should not show client section on homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    const sidebar = page.locator('.sidebar');
    
    // Check that no client section is visible
    const clientSection = sidebar.locator('.nav-item:has(.nav-link[type="button"])');
    await expect(clientSection).not.toBeVisible();
    
    // Check that footer logs section is not visible
    const footerNav = sidebar.locator('.footer-nav');
    await expect(footerNav).not.toBeVisible();
  });

  test('should show client section on job detail page', async ({ page }) => {
    // This would require a real job with a client
    // For now, we'll skip this test as it requires database seeding
    test.skip();
    
    // Navigate to a job detail page
    // await page.goto('/jobs/[job-id]');
    
    // const sidebar = page.locator('.sidebar');
    
    // // Check that client section is visible
    // const clientSection = sidebar.locator('.nav-item:has(.nav-link[type="button"])');
    // await expect(clientSection).toBeVisible();
    
    // // Check that client name is displayed
    // await expect(clientSection).toContainText('Client Name');
    
    // // Check that footer shows client's logs
    // const footerNav = sidebar.locator('.footer-nav');
    // await expect(footerNav).toBeVisible();
    // await expect(footerNav).toContainText("Client Name's Logs");
  });

  test('should show client section on client detail page', async ({ page }) => {
    // This would require a real client
    // For now, we'll skip this test as it requires database seeding
    test.skip();
    
    // Navigate to a client detail page
    // await page.goto('/clients/[client-id]');
    
    // const sidebar = page.locator('.sidebar');
    
    // // Check that client section is visible
    // const clientSection = sidebar.locator('.nav-item:has(.nav-link[type="button"])');
    // await expect(clientSection).toBeVisible();
    
    // // Check that client name is displayed
    // await expect(clientSection).toContainText('Client Name');
    
    // // Check that footer shows client's logs
    // const footerNav = sidebar.locator('.footer-nav');
    // await expect(footerNav).toBeVisible();
    // await expect(footerNav).toContainText("Client Name's Logs");
  });

  test('should not show client section on jobs listing page', async ({ page }) => {
    // Navigate to jobs listing
    await page.goto('/jobs');
    
    const sidebar = page.locator('.sidebar');
    
    // Check that no client section is visible
    const clientSection = sidebar.locator('.nav-item:has(.nav-link[type="button"])');
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