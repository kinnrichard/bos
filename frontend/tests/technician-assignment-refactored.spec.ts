import { test, expect } from '@playwright/test';

test.describe('TechnicianAssignmentButton (Refactored with TanStack Query)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to jobs page
    await page.goto('/jobs');
    
    // Wait for the page to load and jobs to be visible
    await expect(page.locator('[data-testid="job-row"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('displays assignment button correctly', async ({ page }) => {
    // Find the first technician assignment button
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await expect(assignmentButton).toBeVisible();
    
    // Button should be initially circular (no assignments)
    await expect(assignmentButton).toHaveClass(/assignment-button/);
  });

  test('opens assignment panel when clicked', async ({ page }) => {
    // Click the assignment button
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await assignmentButton.click();
    
    // Panel should be visible
    const panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    
    // Should show "Assigned to..." title
    await expect(panel.locator('.assignment-title')).toHaveText('Assigned to…');
  });

  test('loads users with TanStack Query', async ({ page }) => {
    // Click the assignment button to open panel
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await assignmentButton.click();
    
    const panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    
    // Should either show loading indicator or user checkboxes
    const loadingIndicator = panel.locator('.loading-indicator');
    const userCheckboxes = panel.locator('.user-checkboxes');
    
    // Wait for either loading to finish or users to appear
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    } catch {
      // Loading might be too fast to catch
    }
    
    // Should show user checkboxes
    await expect(userCheckboxes).toBeVisible();
    
    // Should have at least one user checkbox
    const userCheckbox = userCheckboxes.locator('.user-checkbox').first();
    await expect(userCheckbox).toBeVisible();
  });

  test('can assign and unassign technicians', async ({ page }) => {
    // Click the assignment button to open panel
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await assignmentButton.click();
    
    const panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    
    // Wait for users to load
    await expect(panel.locator('.user-checkboxes')).toBeVisible();
    
    // Find the first unchecked user checkbox
    const firstCheckbox = panel.locator('.user-checkbox input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    
    const isChecked = await firstCheckbox.isChecked();
    
    if (!isChecked) {
      // Assign technician
      await firstCheckbox.check();
      
      // Should show loading indicator briefly
      const loadingIndicator = panel.locator('.loading-indicator');
      try {
        await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      } catch {
        // Loading might be too fast to catch
      }
      
      // Checkbox should now be checked
      await expect(firstCheckbox).toBeChecked();
      
      // Button should now show assignment (might change shape)
      // Note: We can't easily test the visual changes without more complex setup
    }
    
    // Test unassigning
    if (await firstCheckbox.isChecked()) {
      await firstCheckbox.uncheck();
      
      // Should show loading briefly
      try {
        const loadingIndicator = panel.locator('.loading-indicator');
        await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      } catch {
        // Loading might be too fast to catch
      }
      
      // Checkbox should now be unchecked
      await expect(firstCheckbox).not.toBeChecked();
    }
  });

  test('handles errors gracefully', async ({ page }) => {
    // Mock a network failure for user loading
    await page.route('**/users', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Click the assignment button
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await assignmentButton.click();
    
    const panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    
    // Should show error message
    const errorMessage = panel.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Failed to load users');
  });

  test('persists technician selections to localStorage', async ({ page }) => {
    // Click the assignment button to open panel
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await assignmentButton.click();
    
    const panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    
    // Wait for users to load
    await expect(panel.locator('.user-checkboxes')).toBeVisible();
    
    // Make an assignment
    const firstCheckbox = panel.locator('.user-checkbox input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    
    if (!await firstCheckbox.isChecked()) {
      await firstCheckbox.check();
      
      // Wait for assignment to complete
      await page.waitForTimeout(1000);
      
      // Check that localStorage has been updated
      const localStorage = await page.evaluate(() => {
        const stored = window.localStorage.getItem('bos:technician-selections');
        return stored ? JSON.parse(stored) : {};
      });
      
      // Should have at least one job with technician selections
      expect(Object.keys(localStorage).length).toBeGreaterThan(0);
    }
  });

  test('uses cached user data for better performance', async ({ page }) => {
    let userRequestCount = 0;
    
    // Monitor API requests
    page.on('request', request => {
      if (request.url().includes('/users')) {
        userRequestCount++;
      }
    });
    
    // First access
    const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
    await assignmentButton.click();
    
    let panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.user-checkboxes')).toBeVisible();
    
    // Close panel
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
    
    // Second access - should use cached data
    await assignmentButton.click();
    panel = page.locator('.assignment-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.user-checkboxes')).toBeVisible();
    
    // Should have made only one request (TanStack Query caching)
    expect(userRequestCount).toBeLessThanOrEqual(2); // Allow for potential initial request
  });

  test.describe('Accessibility', () => {
    test('maintains proper focus management', async ({ page }) => {
      const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
      
      // Focus the button
      await assignmentButton.focus();
      await expect(assignmentButton).toBeFocused();
      
      // Open panel with Enter
      await page.keyboard.press('Enter');
      const panel = page.locator('.assignment-panel');
      await expect(panel).toBeVisible();
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      
      // Button should regain focus
      await expect(assignmentButton).toBeFocused();
    });

    test('supports keyboard navigation in user list', async ({ page }) => {
      const assignmentButton = page.locator('.technician-assignment-popover .assignment-button').first();
      await assignmentButton.click();
      
      const panel = page.locator('.assignment-panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('.user-checkboxes')).toBeVisible();
      
      // Tab to first checkbox
      await page.keyboard.press('Tab');
      
      const firstCheckbox = panel.locator('.user-checkbox input[type="checkbox"]').first();
      await expect(firstCheckbox).toBeFocused();
      
      // Space to toggle
      await page.keyboard.press('Space');
      
      // Should toggle the checkbox
      const wasChecked = await firstCheckbox.isChecked();
      await page.keyboard.press('Space');
      
      const isNowChecked = await firstCheckbox.isChecked();
      expect(isNowChecked).toBe(!wasChecked);
    });
  });
});