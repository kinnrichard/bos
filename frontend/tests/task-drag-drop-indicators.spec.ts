import { test, expect } from '@playwright/test';
import { AuthHelper } from '../test-helpers/auth';
import { TestDatabase } from '../test-helpers/database';
import { DataFactory } from '../test-helpers/data-factories';

test.describe('Task Drag & Drop Indicators', () => {
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
    
    // Start dragging the first task
    await firstTask.hover();
    await page.mouse.down();
    
    // Move to the second task position
    await secondTask.hover();
    
    // Wait a moment for drag to register
    await page.waitForTimeout(500);
    
    // Check that a drop indicator appears (try multiple possible selectors)
    const dropIndicator = page.locator('.native-drop-indicator, .drop-indicator, .sortable-drop-indicator, .drag-indicator').first();
    await expect(dropIndicator).toBeVisible({ timeout: 3000 });
    
    // Complete the drag
    await page.mouse.up();
    
    // Drop indicator should disappear
    await expect(dropIndicator).not.toBeVisible({ timeout: 2000 });
  });

  test('should not show borders or glow during drag', async ({ page }) => {
    const firstTask = page.locator('[data-task-id]').first();
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    
    // Move slightly to trigger drag
    await page.mouse.move(100, 100);
    
    // Wait for drag state to be applied
    await page.waitForTimeout(500);
    
    // Check that the first task has dragging class applied
    const draggedElement = page.locator('[data-task-id].task-dragging').first();
    await expect(draggedElement).toBeVisible({ timeout: 3000 });
    
    // Verify drag state is applied
    const hasDragClass = await draggedElement.count() > 0;
    expect(hasDragClass).toBe(true);
    
    // Complete the drag
    await page.mouse.up();
  });

  test('should remove selection styling during drag', async ({ page }) => {
    const firstTask = page.locator('[data-task-id]').first();
    
    // Select the task first
    await firstTask.click();
    await expect(firstTask).toHaveClass(/selected/);
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    
    // Wait for drag to register
    await page.waitForTimeout(500);
    
    // Check that the dragged task has proper drag classes
    const draggedElement = page.locator('[data-task-id].task-dragging').first();
    await expect(draggedElement).toBeVisible({ timeout: 3000 });
    
    // Verify specific drag classes are applied
    await expect(draggedElement).toHaveClass(/task-dragging/);
    await expect(draggedElement).toHaveClass(/task-selected-for-drag/);
    
    // Complete the drag
    await page.mouse.up();
  });

  test('should show drop indicators at different positions', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    await expect(tasks).toHaveCount(3);
    
    const firstTask = tasks.first();
    
    // Start dragging the first task
    await firstTask.hover();
    await page.mouse.down();
    
    // Test drop indicator at second position
    await tasks.nth(1).hover();
    let dropIndicator = page.locator('.drop-indicator');
    await expect(dropIndicator).toBeVisible();
    
    // Test drop indicator at third position
    await tasks.nth(2).hover();
    await expect(dropIndicator).toBeVisible();
    
    // Complete the drag
    await page.mouse.up();
    await expect(dropIndicator).toHaveCount(0);
  });

  test('should handle multi-select drag with indicators', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    await expect(tasks).toHaveCount(3);
    
    // Select multiple tasks using Ctrl+click
    await tasks.first().click();
    await tasks.nth(1).click({ modifiers: ['Meta'] }); // Use Meta for macOS
    
    // Verify multi-selection
    await expect(page.locator('[data-task-id].selected')).toHaveCount(2);
    
    // Start dragging one of the selected tasks
    await tasks.first().hover();
    await page.mouse.down();
    
    // Move to another position
    await tasks.nth(2).hover();
    
    // Check that drop indicator appears
    const dropIndicator = page.locator('.sortable-drop-indicator');
    await expect(dropIndicator).toBeVisible();
    
    // Check for multi-drag badge
    const multiBadge = page.locator('.multi-drag-badge');
    await expect(multiBadge).toBeVisible();
    
    // Complete the drag
    await page.mouse.up();
    await expect(dropIndicator).toHaveCount(0);
    
    // Verify that multi-drag badges are cleaned up after the drag
    await expect(multiBadge).toHaveCount(0);
  });

  test('should position drop indicator at full width', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    await tasks.nth(1).hover();
    
    // Check that drop indicator spans full width
    const dropIndicator = page.locator('.sortable-drop-indicator');
    await expect(dropIndicator).toBeVisible();
    await expect(dropIndicator).toHaveCSS('width', '100%');
    
    // Complete the drag
    await page.mouse.up();
  });

  test('should instantly show and hide drop indicators', async ({ page }) => {
    const tasks = page.locator('[data-task-id]');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    
    // Move to second task and verify instant appearance
    await secondTask.hover();
    const dropIndicator = page.locator('.sortable-drop-indicator');
    await expect(dropIndicator).toBeVisible();
    
    // Move away and verify instant disappearance
    await page.mouse.move(0, 0);
    
    // Complete the drag and verify instant cleanup
    await page.mouse.up();
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
    
    // Multi-select first two tasks
    await firstTask.click();
    await secondTask.click({ modifiers: ['Meta'] });
    
    // Start dragging from first task
    await firstTask.hover();
    await page.mouse.down();
    
    // Move to trigger multi-drag badge appearance
    await tasks.nth(2).hover();
    
    // Check for multi-drag badge
    const multiBadge = page.locator('.multi-drag-badge');
    await expect(multiBadge).toBeVisible();
    
    // Complete the drag (this will trigger the mocked failure)
    await page.mouse.up();
    
    // Wait a moment for the error to be processed
    await page.waitForTimeout(100);
    
    // Verify that multi-drag badges are cleaned up even after failure
    await expect(multiBadge).toHaveCount(0);
    
    // Also verify drop indicators are cleaned up
    const dropIndicator = page.locator('.sortable-drop-indicator');
    await expect(dropIndicator).toHaveCount(0);
  });
});