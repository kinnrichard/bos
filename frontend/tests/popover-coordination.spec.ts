import { test, expect } from '@playwright/test';

test.describe('Popover Coordination', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page that has multiple popovers (job detail page)
    await page.goto('/jobs/1');
    await page.waitForLoadState('networkidle');
  });

  test('only one popover can be open at a time', async ({ page }) => {
    // Find popover buttons (job status and technician assignment)
    const jobStatusButton = page.locator('[title="Job Status"]');
    const technicianButton = page.locator('[title*="Technician"]');

    // Open job status popover
    await jobStatusButton.click();
    
    // Verify job status popover is open
    await expect(page.locator('.popover-panel').first()).toBeVisible();
    
    // Open technician assignment popover
    await technicianButton.click();
    
    // Verify only technician popover is visible (job status should be closed)
    const visiblePanels = page.locator('.popover-panel:visible');
    await expect(visiblePanels).toHaveCount(1);
    
    // Verify it's the technician popover that's open
    await expect(page.locator('.popover-panel:visible')).toContainText('Assigned To');
  });

  test('escape key closes all popovers', async ({ page }) => {
    // Open a popover
    const jobStatusButton = page.locator('[title="Job Status"]');
    await jobStatusButton.click();
    
    // Verify popover is open
    await expect(page.locator('.popover-panel')).toBeVisible();
    
    // Press escape key
    await page.keyboard.press('Escape');
    
    // Verify popover is closed
    await expect(page.locator('.popover-panel')).not.toBeVisible();
  });

  test('clicking outside closes popover', async ({ page }) => {
    // Open a popover
    const jobStatusButton = page.locator('[title="Job Status"]');
    await jobStatusButton.click();
    
    // Verify popover is open
    await expect(page.locator('.popover-panel')).toBeVisible();
    
    // Click outside the popover (on the page background)
    await page.click('body', { position: { x: 100, y: 100 } });
    
    // Verify popover is closed
    await expect(page.locator('.popover-panel')).not.toBeVisible();
  });

  test('opening popover via keyboard shortcut closes others', async ({ page }) => {
    // First open one popover manually
    const jobStatusButton = page.locator('[title="Job Status"]');
    await jobStatusButton.click();
    
    // Verify first popover is open
    await expect(page.locator('.popover-panel')).toBeVisible();
    
    // Use keyboard shortcut to open another popover (if available)
    // This test depends on the specific keyboard shortcuts in your app
    // You may need to adjust the key combination based on your implementation
    await page.keyboard.press('Alt+t'); // Example: Alt+T for technicians
    
    // Verify only one popover is visible
    const visiblePanels = page.locator('.popover-panel:visible');
    await expect(visiblePanels).toHaveCount(1);
  });

  test('popover maintains functionality after coordination changes', async ({ page }) => {
    // Open job status popover
    const jobStatusButton = page.locator('[title="Job Status"]');
    await jobStatusButton.click();
    
    // Verify we can interact with popover content
    await expect(page.locator('.popover-panel')).toContainText('Job Status');
    
    // Try to select a status option
    const statusOption = page.locator('.option-item').first();
    if (await statusOption.isVisible()) {
      await statusOption.click();
      
      // Verify popover closes after selection
      await expect(page.locator('.popover-panel')).not.toBeVisible();
    }
  });
});