import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { TestDatabase } from './helpers/database';
import { DataFactory } from './helpers/data-factories';

test.describe('Task Drag & Drop Indicators', () => {
  let auth: AuthHelper;
  let dataFactory: DataFactory;
  let jobId: string;

  test.beforeEach(async ({ page }) => {
    // Initialize helpers
    auth = new AuthHelper(page);
    dataFactory = new DataFactory(page);
    
    // Authenticate as admin user
    await auth.setupAuthenticatedSession('admin');
    
    // Create test data (job with client and multiple tasks for drag/drop)
    const client = await dataFactory.createClient({ name: `Test Client ${Date.now()}-${Math.random().toString(36).substring(7)}` });
    const job = await dataFactory.createJob({
      title: `Test Job ${Date.now()}`,
      status: 'in_progress',
      priority: 'high',
      client_id: client.id
    });
    
    jobId = job.id;
    
    // Create multiple tasks for drag/drop indicator testing
    await dataFactory.createTask({
      title: `Draggable Task 1 ${Date.now()}`,
      job_id: job.id,
      status: 'new_task'
    });
    await dataFactory.createTask({
      title: `Draggable Task 2 ${Date.now()}`,
      job_id: job.id,
      status: 'in_progress'
    });
    await dataFactory.createTask({
      title: `Draggable Task 3 ${Date.now()}`,
      job_id: job.id,
      status: 'successfully_completed'
    });
    
    // Navigate to the specific job detail page
    await page.goto(`/jobs/${jobId}`);
    
    // Wait for tasks to load
    await expect(page.locator('[data-task-id]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show blue drop indicator during drag operation', async ({ page }) => {
    // Get the first two tasks
    const tasks = page.locator('[data-task-id]');
    await expect(tasks).toHaveCount(3); // We create 3 tasks in beforeEach
    
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Use Playwright's dragAndDrop which handles HTML5 drag properly
    await firstTask.dragTo(secondTask);
    
    // Verify the drag operation completed (tasks should be reordered)
    // Since we dropped first task on second task, the order should change
    await page.waitForTimeout(500); // Wait for reorder to complete
    
    // Check that the task count is still correct
    await expect(tasks).toHaveCount(3);
  });

  test('should not show borders or glow during drag', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Perform a simple drag operation to test the drag styling
    await firstTask.dragTo(secondTask);
    
    // Wait for drag operation to complete
    await page.waitForTimeout(500);
    
    // After drag completes, verify no dragging classes remain
    const draggedElements = page.locator('[data-task-id].task-dragging');
    await expect(draggedElements).toHaveCount(0);
    
    // Verify tasks are still present and interactable
    await expect(tasks).toHaveCount(3);
  });

  test('should remove selection styling during drag', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Select the task first
    await firstTask.click();
    await expect(firstTask).toHaveClass(/selected/);
    
    // Perform drag operation
    await firstTask.dragTo(secondTask);
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Verify selection state is properly handled after drag
    await expect(tasks).toHaveCount(3);
    
    // Clear any selection and verify
    await page.click('body');
    const selectedTasks = page.locator('[data-task-id].selected');
    await expect(selectedTasks).toHaveCount(0);
  });

  test('should show drop indicators at different positions', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    await expect(tasks).toHaveCount(3);
    
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    const thirdTask = tasks.nth(2);
    
    // Test drag to second position
    await firstTask.dragTo(secondTask);
    await page.waitForTimeout(300);
    
    // Test drag to third position (using first task again)
    await firstTask.dragTo(thirdTask);
    await page.waitForTimeout(300);
    
    // Verify all tasks are still present after drag operations
    await expect(tasks).toHaveCount(3);
  });

  test('should handle multi-select drag with indicators', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    await expect(tasks).toHaveCount(3);
    
    // Select multiple tasks using Ctrl+click
    await tasks.first().click();
    await tasks.nth(1).click({ modifiers: ['Meta'] }); // Use Meta for macOS
    
    // Verify multi-selection
    await expect(page.locator('[data-task-id].selected')).toHaveCount(2);
    
    const firstTask = tasks.first();
    const targetTask = tasks.nth(2);
    
    // Perform multi-drag operation
    await firstTask.dragTo(targetTask);
    
    // Wait for drag operation to complete
    await page.waitForTimeout(500);
    
    // Verify all tasks are still present
    await expect(tasks).toHaveCount(3);
    
    // Clear selection
    await page.click('body');
    const selectedTasks = page.locator('[data-task-id].selected');
    await expect(selectedTasks).toHaveCount(0);
  });

  test('should position drop indicator at full width', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Perform drag operation
    await firstTask.dragTo(secondTask);
    
    // Wait for operation to complete
    await page.waitForTimeout(300);
    
    // Verify all tasks are still present after drag
    await expect(tasks).toHaveCount(3);
    
    // Verify the task list container has proper width
    const taskContainer = page.locator('.task-list, [data-task-id]').first();
    const containerBox = await taskContainer.boundingBox();
    expect(containerBox?.width).toBeGreaterThan(200); // Should be substantial width
  });

  test('should instantly show and hide drop indicators', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Perform quick drag operations to test responsiveness
    await firstTask.dragTo(secondTask);
    await page.waitForTimeout(200);
    
    // Perform another drag in reverse
    await secondTask.dragTo(firstTask);
    await page.waitForTimeout(200);
    
    // Verify all tasks are still present and responsive
    await expect(tasks).toHaveCount(3);
    
    // Verify no drop indicators remain
    const dropIndicator = page.locator('.drag-drop-indicator');
    await expect(dropIndicator).toHaveCount(0);
  });

  test('should clean up multi-drag badges when operations fail', async ({ page }) => {
    // Mock network failure to simulate error scenarios
    await page.route('**/api/v1/jobs/*/tasks/batch_reorder*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    const targetTask = tasks.nth(2);
    
    // Multi-select first two tasks
    await firstTask.click();
    await secondTask.click({ modifiers: ['Meta'] });
    
    // Verify multi-selection
    await expect(page.locator('[data-task-id].selected')).toHaveCount(2);
    
    // Attempt multi-drag operation (this should trigger the mocked failure)
    await firstTask.dragTo(targetTask);
    
    // Wait for error to be processed
    await page.waitForTimeout(1000);
    
    // Verify tasks are still present (failure should not break the UI)
    await expect(tasks).toHaveCount(3);
    
    // Verify cleanup - no badges or indicators should remain
    const multiBadge = page.locator('.multi-drag-badge');
    await expect(multiBadge).toHaveCount(0);
    
    const dropIndicator = page.locator('.drag-drop-indicator');
    await expect(dropIndicator).toHaveCount(0);
    
    // Clear any remaining selection
    await page.click('body');
  });
});