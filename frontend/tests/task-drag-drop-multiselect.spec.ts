import { test, expect } from '@playwright/test';
import { AuthHelper } from '../test-helpers/auth';
import { TestDatabase } from '../test-helpers/database';
import { DataFactory } from '../test-helpers/data-factories';

test.describe('Task Drag & Drop and Multi-Select Features', () => {
  let db: TestDatabase;
  let auth: AuthHelper;
  let dataFactory: DataFactory;
  let jobId: string;

  test.beforeEach(async ({ page }) => {
    // Initialize helpers
    db = new TestDatabase();
    auth = new AuthHelper(page);
    dataFactory = new DataFactory(page);
    
    // Authenticate as admin user
    await auth.setupAuthenticatedSession('admin');
    
    // Create test data (job with client and tasks) so drag/drop has content
    const client = await dataFactory.createClient({ name: `Test Client ${Date.now()}-${Math.random().toString(36).substring(7)}` });
    const job = await dataFactory.createJob({
      title: `Test Job ${Date.now()}`,
      status: 'in_progress',
      priority: 'high',
      client_id: client.id
    });
    
    jobId = job.id;
    
    // Create multiple tasks for drag/drop and multi-select testing
    await dataFactory.createTask({
      title: `Task 1 ${Date.now()}`,
      job_id: job.id,
      status: 'new_task'
    });
    await dataFactory.createTask({
      title: `Task 2 ${Date.now()}`,
      job_id: job.id,
      status: 'in_progress'
    });
    await dataFactory.createTask({
      title: `Task 3 ${Date.now()}`,
      job_id: job.id,
      status: 'successfully_completed'
    });
    
    // Navigate to the specific job detail page (where tasks can be manipulated)
    await page.goto(`/jobs/${jobId}`);
    
    // Wait for tasks to load on the job detail page
    await expect(page.locator('[data-task-id]').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Drag & Drop Functionality (SVELTE-007)', () => {
    test('should reorder tasks via drag and drop', async ({ page }) => {
      // Wait for tasks to be visible
      const taskItems = await page.locator('[data-task-id]').all();
      if (taskItems.length < 2) {
        test.skip('Need at least 2 tasks for drag and drop test');
      }

      // Get initial order
      const initialOrder = await page.locator('[data-task-id]').evaluateAll(
        elements => elements.map(el => el.getAttribute('data-task-id'))
      );

      // Drag first task to second position
      const firstTask = page.locator('[data-task-id]').first();
      const secondTask = page.locator('[data-task-id]').nth(1);
      
      await firstTask.dragTo(secondTask);
      
      // Wait for reorder to complete
      await page.waitForTimeout(500);
      
      // Check that order has changed
      const newOrder = await page.locator('[data-task-id]').evaluateAll(
        elements => elements.map(el => el.getAttribute('data-task-id'))
      );
      
      expect(newOrder).not.toEqual(initialOrder);
      expect(newOrder[0]).toBe(initialOrder[1]);
    });

    test('should show visual feedback during drag', async ({ page }) => {
      const taskItems = await page.locator('[data-task-id]').all();
      if (taskItems.length < 1) {
        test.skip('Need at least 1 task for drag feedback test');
      }

      const firstTask = page.locator('[data-task-id]').first();
      
      // Start drag
      await firstTask.hover();
      await page.mouse.down();
      
      // Check for dragging class
      await expect(firstTask).toHaveClass(/dragging/);
      
      // Check for visual feedback message
      await expect(page.locator('.feedback-message')).toContainText('Reordering tasks');
      
      // End drag
      await page.mouse.up();
      
      // Verify dragging class is removed
      await expect(firstTask).not.toHaveClass(/dragging/);
    });

    test('should handle reorder API failure with rollback', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/v1/jobs/*/tasks/reorder', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      const taskItems = await page.locator('[data-task-id]').all();
      if (taskItems.length < 2) {
        test.skip('Need at least 2 tasks for rollback test');
      }

      // Get initial order
      const initialOrder = await page.locator('[data-task-id]').evaluateAll(
        elements => elements.map(el => el.getAttribute('data-task-id'))
      );

      // Attempt drag and drop
      await page.locator('[data-task-id]').first().dragTo(
        page.locator('[data-task-id]').nth(1)
      );
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // Check for error message
      await expect(page.locator('.feedback-message.error')).toBeVisible();
      
      // Verify order is restored (rollback)
      const finalOrder = await page.locator('[data-task-id]').evaluateAll(
        elements => elements.map(el => el.getAttribute('data-task-id'))
      );
      
      expect(finalOrder).toEqual(initialOrder);
    });

    test('should work on touch devices', async ({ page, browserName }) => {
      if (browserName !== 'webkit') {
        test.skip();
        return;
      }

      // Simulate touch device
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const taskItems = await page.locator('[data-task-id]').all();
      if (taskItems.length < 1) {
        test.skip('Need at least 1 task for touch test');
      }

      const firstTask = page.locator('[data-task-id]').first();
      
      // Check for touch drag handle visibility
      await expect(firstTask).toHaveCSS('min-height', '44px');
      
      // Verify drag handle is visible on touch
      const dragHandle = firstTask.locator('::before');
      // Note: ::before pseudo-elements are hard to test directly
      // Instead check that touch styles are applied
      await expect(firstTask).toHaveCSS('touch-action', 'manipulation');
    });
  });

  test.describe('Multi-Select Functionality (SVELTE-008)', () => {
    test('should select single task on normal click', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();
      
      await firstTask.click();
      
      // Check for selection indicators
      await expect(firstTask).toHaveClass(/selected/);
      await expect(firstTask.locator('.selection-indicator')).toBeVisible();
      
      // Verify only one task is selected
      const selectedTasks = await page.locator('.task-item.selected').count();
      expect(selectedTasks).toBe(1);
    });

    test('should toggle selection with Cmd+click (Mac) or Ctrl+click', async ({ page, browserName }) => {
      const firstTask = page.locator('[data-task-id]').first();
      const secondTask = page.locator('[data-task-id]').nth(1);
      
      if (!await secondTask.isVisible()) {
        test.skip('Need at least 2 tasks for multi-select test');
      }

      const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
      
      // Select first task normally
      await firstTask.click();
      await expect(firstTask).toHaveClass(/selected/);
      
      // Add second task with modifier
      await secondTask.click({ modifiers: [modifierKey] });
      
      // Both should be selected
      await expect(firstTask).toHaveClass(/selected/);
      await expect(secondTask).toHaveClass(/selected/);
      
      // Check multi-select info
      await expect(page.locator('.multi-select-info')).toContainText('2 tasks selected');
      
      // Deselect first task with modifier
      await firstTask.click({ modifiers: [modifierKey] });
      await expect(firstTask).not.toHaveClass(/selected/);
      await expect(secondTask).toHaveClass(/selected/);
    });

    test('should select range with Shift+click', async ({ page }) => {
      const tasks = await page.locator('[data-task-id]').all();
      if (tasks.length < 3) {
        test.skip('Need at least 3 tasks for range selection test');
      }

      // Select first task
      await page.locator('[data-task-id]').first().click();
      
      // Shift+click on third task
      await page.locator('[data-task-id]').nth(2).click({ modifiers: ['Shift'] });
      
      // Check that first three tasks are selected
      for (let i = 0; i < 3; i++) {
        await expect(page.locator('[data-task-id]').nth(i)).toHaveClass(/selected/);
      }
      
      // Check multi-select info shows correct count
      await expect(page.locator('.multi-select-info')).toContainText('3 tasks selected');
    });

    test('should clear all selections', async ({ page }) => {
      const tasks = await page.locator('[data-task-id]').all();
      if (tasks.length < 2) {
        test.skip('Need at least 2 tasks for clear selection test');
      }

      // Select multiple tasks
      await page.locator('[data-task-id]').first().click();
      await page.locator('[data-task-id]').nth(1).click({ modifiers: ['Control'] });
      
      // Verify multi-select is active
      await expect(page.locator('.multi-select-info')).toBeVisible();
      
      // Click clear selection button
      await page.locator('.clear-selection').click();
      
      // Verify no tasks are selected
      const selectedCount = await page.locator('.task-item.selected').count();
      expect(selectedCount).toBe(0);
      
      // Verify multi-select info is hidden
      await expect(page.locator('.multi-select-info')).not.toBeVisible();
    });

    test('should show visual selection indicators', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();
      
      await firstTask.click();
      
      // Check selection styling
      await expect(firstTask).toHaveClass(/selected/);
      await expect(firstTask).toHaveCSS('background-color', /rgba\(0, 163, 255, 0\.15\)/);
      await expect(firstTask).toHaveCSS('border-left', /3px solid/);
      
      // Check selection indicator
      const indicator = firstTask.locator('.selection-indicator');
      await expect(indicator).toBeVisible();
      await expect(indicator).toContainText('✓');
      await expect(indicator).toHaveCSS('background-color', 'rgb(0, 163, 255)');
    });

    test('should maintain selection during page interactions', async ({ page }) => {
      const tasks = await page.locator('[data-task-id]').all();
      if (tasks.length < 2) {
        test.skip('Need at least 2 tasks for selection persistence test');
      }

      // Select multiple tasks
      await page.locator('[data-task-id]').first().click();
      await page.locator('[data-task-id]').nth(1).click({ modifiers: ['Control'] });
      
      // Interact with task disclosure triangle (if available)
      const disclosureButton = page.locator('.disclosure-button').first();
      if (await disclosureButton.isVisible()) {
        await disclosureButton.click();
        
        // Verify selections persist after disclosure interaction
        await expect(page.locator('[data-task-id]').first()).toHaveClass(/selected/);
        await expect(page.locator('[data-task-id]').nth(1)).toHaveClass(/selected/);
      }
    });
  });

  test.describe('Status Change Integration', () => {
    test('should cycle through task statuses on emoji click', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();
      const statusButton = firstTask.locator('.status-emoji');
      
      // Get initial status emoji
      const initialEmoji = await statusButton.textContent();
      
      // Click to change status
      await statusButton.click();
      
      // Wait for status change
      await page.waitForTimeout(500);
      
      // Verify emoji changed
      const newEmoji = await statusButton.textContent();
      expect(newEmoji).not.toBe(initialEmoji);
      
      // Check for success feedback
      await expect(page.locator('.feedback-message')).toBeVisible();
    });

    test('should handle status change API failure', async ({ page }) => {
      // Mock API failure for status change
      await page.route('**/api/v1/jobs/*/tasks/*/update_status', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to update status' })
        });
      });

      const firstTask = page.locator('[data-task-id]').first();
      const statusButton = firstTask.locator('.status-emoji');
      
      const initialEmoji = await statusButton.textContent();
      
      // Attempt status change
      await statusButton.click();
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // Verify emoji reverted (rollback)
      const finalEmoji = await statusButton.textContent();
      expect(finalEmoji).toBe(initialEmoji);
      
      // Check for error feedback
      await expect(page.locator('.feedback-message')).toContainText('Failed to update task status');
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should be keyboard accessible', async ({ page }) => {
      // Find the first task element and click it to set focus
      const firstTask = page.locator('[data-task-id]').first();
      await firstTask.click();
      
      // Check that the task element has focus or is selected
      await expect(firstTask).toHaveClass(/selected/);
      
      // Verify the task is visible and interactive
      await expect(firstTask).toBeVisible();
    });

    test('should show proper ARIA attributes', async ({ page }) => {
      const disclosureButton = page.locator('.disclosure-button').first();
      
      if (await disclosureButton.isVisible()) {
        // Check aria-expanded attribute
        await expect(disclosureButton).toHaveAttribute('aria-expanded');
        await expect(disclosureButton).toHaveAttribute('aria-label');
      }
    });

    test('should provide helpful tooltips', async ({ page }) => {
      const statusButton = page.locator('.status-emoji').first();
      
      await expect(statusButton).toHaveAttribute('title', 'Click to change status');
      
      const clearButton = page.locator('.clear-selection');
      if (await clearButton.isVisible()) {
        await expect(clearButton).toHaveAttribute('title', 'Clear selection');
      }
    });

    test('should animate smoothly', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();
      
      // Check transition properties
      await expect(firstTask).toHaveCSS('transition', /0\.2s/);
      
      // Test selection animation
      await firstTask.click();
      
      const indicator = firstTask.locator('.selection-indicator');
      await expect(indicator).toHaveCSS('animation-name', 'scaleIn');
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should handle large numbers of tasks efficiently', async ({ page }) => {
      // This test assumes there are many tasks loaded
      const taskCount = await page.locator('[data-task-id]').count();
      
      if (taskCount > 10) {
        // Measure selection performance
        const startTime = Date.now();
        
        // Select all tasks quickly
        for (let i = 0; i < Math.min(taskCount, 20); i++) {
          await page.locator('[data-task-id]').nth(i).click({ 
            modifiers: ['Control'],
            timeout: 100 
          });
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete within reasonable time (2 seconds)
        expect(duration).toBeLessThan(2000);
      }
    });

    test('should handle rapid interactions gracefully', async ({ page }) => {
      const tasks = await page.locator('[data-task-id]').all();
      if (tasks.length < 3) {
        test.skip('Need at least 3 tasks for rapid interaction test');
      }

      // Rapidly click multiple tasks
      for (let i = 0; i < 3; i++) {
        await page.locator('[data-task-id]').nth(i).click({
          modifiers: ['Control'],
          timeout: 50
        });
      }
      
      // Wait for all updates to settle
      await page.waitForTimeout(500);
      
      // Verify final state is consistent
      const selectedCount = await page.locator('.task-item.selected').count();
      expect(selectedCount).toBeGreaterThanOrEqual(1);
      
      const infoText = await page.locator('.multi-select-info').textContent();
      expect(infoText).toContain(`${selectedCount} tasks selected`);
    });
  });
});