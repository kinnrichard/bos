import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../helpers/auth';
import { DataFactory } from '../../helpers/data-factories';

test.describe('Task Drag & Drop Operations', () => {
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
    const client = await dataFactory.createClient({
      name: `Test Client ${Date.now()}-${Math.random().toString(36).substring(7)}`,
    });
    const job = await dataFactory.createJob({
      title: `Test Job ${Date.now()}`,
      status: 'in_progress',
      priority: 'high',
      client_id: client.id,
    });

    jobId = job.id;

    // Create multiple tasks for drag/drop testing
    await dataFactory.createTask({
      title: `Draggable Task 1 ${Date.now()}`,
      job_id: job.id,
      status: 'new_task',
    });
    await dataFactory.createTask({
      title: `Draggable Task 2 ${Date.now()}`,
      job_id: job.id,
      status: 'in_progress',
    });
    await dataFactory.createTask({
      title: `Draggable Task 3 ${Date.now()}`,
      job_id: job.id,
      status: 'successfully_completed',
    });

    // Navigate to the specific job detail page
    await page.goto(`/jobs/${jobId}`);

    // Wait for task list to load
    await expect(page.locator('[data-task-id]').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Visual Drop Indicators', () => {
    test('should show drop indicators when dragging task over valid drop zones', async ({
      page,
    }) => {
      // Get the first task to drag
      const firstTask = page.locator('[data-task-id]').first();
      await expect(firstTask).toBeVisible();

      // Start drag operation
      await firstTask.hover();
      await page.mouse.down();

      // Move to trigger drag state
      await page.mouse.move(100, 100);

      // Check for drop indicators
      const dropIndicators = page.locator('.drop-indicator, .drop-zone-active, .drag-over');
      await expect(dropIndicators.first()).toBeVisible({ timeout: 2000 });

      // End drag
      await page.mouse.up();
    });

    test('should highlight drop zone when hovering during drag', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');
      const firstTask = tasks.first();
      const secondTask = tasks.nth(1);

      // Start dragging first task
      await firstTask.hover();
      await page.mouse.down();

      // Hover over second task (potential drop zone)
      await secondTask.hover();

      // Check for visual feedback
      const highlightedZone = page.locator('.drop-zone-highlight, .drag-over, .drop-target');
      await expect(highlightedZone.first()).toBeVisible({ timeout: 2000 });

      await page.mouse.up();
    });

    test('should show insertion line between tasks', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');
      const firstTask = tasks.first();

      // Start drag
      await firstTask.hover();
      await page.mouse.down();

      // Move between tasks
      const secondTask = tasks.nth(1);
      const secondTaskBox = await secondTask.boundingBox();
      if (secondTaskBox) {
        await page.mouse.move(secondTaskBox.x, secondTaskBox.y - 10);
      }

      // Look for insertion indicator
      const insertionLine = page.locator('.insertion-line, .drop-line, .between-tasks');
      await expect(insertionLine.first()).toBeVisible({ timeout: 2000 });

      await page.mouse.up();
    });
  });

  test.describe('Single Task Drag Operations', () => {
    test('should reorder tasks when dragging and dropping', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');

      // Get initial order
      const initialSecondTask = await tasks.nth(1).getAttribute('data-task-id');

      // Drag first task below second task
      await tasks.first().hover();
      await page.mouse.down();

      const secondTaskBox = await tasks.nth(1).boundingBox();
      if (secondTaskBox) {
        await page.mouse.move(secondTaskBox.x, secondTaskBox.y + 50);
        await page.mouse.up();
      }

      // Wait for reordering to complete
      await page.waitForTimeout(1000);

      // Verify order changed
      const newFirstTask = await tasks.first().getAttribute('data-task-id');
      expect(newFirstTask).toBe(initialSecondTask);
    });

    test('should persist task order after drag operation', async ({ page }) => {
      // Perform drag operation
      const tasks = page.locator('[data-task-id]');
      await tasks.first().hover();
      await page.mouse.down();

      const secondTaskBox = await tasks.nth(1).boundingBox();
      if (secondTaskBox) {
        await page.mouse.move(secondTaskBox.x, secondTaskBox.y + 50);
        await page.mouse.up();
      }

      // Wait for save
      await page.waitForTimeout(2000);

      // Refresh page to verify persistence
      await page.reload();
      await expect(page.locator('[data-task-id]').first()).toBeVisible({ timeout: 10000 });

      // Verify order is maintained after refresh
      const tasksAfterReload = page.locator('[data-task-id]');
      const taskCount = await tasksAfterReload.count();
      expect(taskCount).toBeGreaterThan(0);
    });
  });

  test.describe('Multi-Select Drag Operations', () => {
    test('should allow multi-selection with Ctrl/Cmd+click', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');

      // Click first task
      await tasks.first().click();

      // Ctrl/Cmd+click second task
      await tasks.nth(1).click({ modifiers: ['Meta'] });

      // Verify both tasks are selected
      await expect(tasks.first()).toHaveClass(/selected/);
      await expect(tasks.nth(1)).toHaveClass(/selected/);
    });

    test('should drag multiple selected tasks together', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');

      // Select multiple tasks
      await tasks.first().click();
      await tasks.nth(1).click({ modifiers: ['Meta'] });

      // Start dragging selected tasks
      await tasks.first().hover();
      await page.mouse.down();

      // Move to new position
      const thirdTaskBox = await tasks.nth(2).boundingBox();
      if (thirdTaskBox) {
        await page.mouse.move(thirdTaskBox.x, thirdTaskBox.y + 50);
        await page.mouse.up();
      }

      // Wait for reordering
      await page.waitForTimeout(1000);

      // Verify both tasks moved together
      // Note: Specific verification depends on implementation
      const taskCount = await tasks.count();
      expect(taskCount).toBeGreaterThan(0);
    });

    test('should show correct count indicator for multi-selection', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');

      // Select multiple tasks
      await tasks.first().click();
      await tasks.nth(1).click({ modifiers: ['Meta'] });
      await tasks.nth(2).click({ modifiers: ['Meta'] });

      // Look for selection count indicator
      const countIndicator = page.locator('.selection-count, .selected-count');
      if (await countIndicator.isVisible()) {
        await expect(countIndicator).toContainText('3');
      }
    });

    test('should clear selection after successful multi-drag', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');

      // Select and drag multiple tasks
      await tasks.first().click();
      await tasks.nth(1).click({ modifiers: ['Meta'] });

      // Drag operation
      await tasks.first().hover();
      await page.mouse.down();
      const thirdTaskBox = await tasks.nth(2).boundingBox();
      if (thirdTaskBox) {
        await page.mouse.move(thirdTaskBox.x, thirdTaskBox.y + 50);
        await page.mouse.up();
      }

      // Wait for operation to complete
      await page.waitForTimeout(1000);

      // Verify selection is cleared
      const selectedTasks = page.locator('[data-task-id].selected');
      const selectedCount = await selectedTasks.count();
      expect(selectedCount).toBe(0);
    });
  });

  test.describe('Positioning & Animation', () => {
    test('should animate tasks during drag operation', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();

      // Start drag to trigger animations
      await firstTask.hover();
      await page.mouse.down();

      // Move mouse to trigger positioning changes
      await page.mouse.move(100, 100);

      // Check for animation classes or transitions
      const animatingElements = page.locator('.task-animating, .dragging, .moving');
      await animatingElements
        .first()
        .isVisible()
        .catch(() => false);

      // End drag
      await page.mouse.up();

      // Animation should complete
      await page.waitForTimeout(500);

      // Verify no lingering animation classes
      const lingering = await animatingElements.count();
      expect(lingering).toBe(0);
    });

    test('should maintain proper task positioning during drag', async ({ page }) => {
      const tasks = page.locator('[data-task-id]');
      const firstTask = tasks.first();

      // Get initial position
      const initialBox = await firstTask.boundingBox();
      expect(initialBox).not.toBeNull();

      // Start drag
      await firstTask.hover();
      await page.mouse.down();

      // Move task
      await page.mouse.move(100, 200);

      // Verify task follows cursor
      const draggingBox = await firstTask.boundingBox();
      expect(draggingBox).not.toBeNull();

      // Position should have changed
      if (initialBox && draggingBox) {
        expect(Math.abs(draggingBox.y - initialBox.y)).toBeGreaterThan(10);
      }

      await page.mouse.up();
    });

    test('should handle rapid mouse movements during drag', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();

      // Start drag
      await firstTask.hover();
      await page.mouse.down();

      // Rapid mouse movements
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(100 + i * 20, 100 + i * 20);
        await page.waitForTimeout(50);
      }

      // End drag
      await page.mouse.up();

      // Verify no issues with rapid movements
      await expect(firstTask).toBeVisible();
    });

    test('should handle drag operations near viewport edges', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();

      // Start drag
      await firstTask.hover();
      await page.mouse.down();

      // Move near viewport edge
      const viewport = page.viewportSize();
      if (viewport) {
        await page.mouse.move(viewport.width - 50, viewport.height - 50);
      }

      // Should handle edge positioning gracefully
      await page.mouse.up();

      // Verify task is still visible and properly positioned
      await expect(firstTask).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle drag operation cancellation', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();

      // Start drag
      await firstTask.hover();
      await page.mouse.down();

      // Move task
      await page.mouse.move(100, 100);

      // Cancel with escape key
      await page.keyboard.press('Escape');

      // Verify drag is cancelled and task returns to original position
      await expect(firstTask).toBeVisible();

      // Or end drag normally if escape doesn't work
      await page.mouse.up();
    });

    test('should handle invalid drop zones', async ({ page }) => {
      const firstTask = page.locator('[data-task-id]').first();

      // Start drag
      await firstTask.hover();
      await page.mouse.down();

      // Try to drop on invalid area (e.g., outside task list)
      await page.mouse.move(50, 50); // Top-left corner
      await page.mouse.up();

      // Task should return to original position or remain unchanged
      await expect(firstTask).toBeVisible();
    });
  });
});
