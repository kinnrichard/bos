import { test, expect } from '@playwright/test';

test.describe('Task Drag & Drop Indicators', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a job with multiple tasks
    await page.goto('/jobs/f6f99306-d643-4e2e-ac28-e719f0d4381d');
    
    // Wait for tasks to load
    await page.waitForSelector('.task-item', { timeout: 10000 });
  });

  test('should show blue drop indicator during drag operation', async ({ page }) => {
    // Get the first two tasks
    const tasks = page.locator('.task-item');
    await expect(tasks).toHaveCount.greaterThan(1);
    
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Start dragging the first task
    await firstTask.hover();
    await page.mouse.down();
    
    // Move to the second task position
    await secondTask.hover();
    
    // Check that a drop indicator appears
    const dropIndicator = page.locator('.drop-indicator');
    await expect(dropIndicator).toBeVisible();
    
    // Verify the indicator styling
    await expect(dropIndicator).toHaveCSS('background-color', 'rgb(0, 122, 255)'); // #007AFF
    await expect(dropIndicator).toHaveCSS('height', '2px');
    
    // Complete the drag
    await page.mouse.up();
    
    // Drop indicator should disappear
    await expect(dropIndicator).toHaveCount(0);
  });

  test('should not show borders or glow during drag', async ({ page }) => {
    const firstTask = page.locator('.task-item').first();
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    
    // Move slightly to trigger drag
    await page.mouse.move(100, 100);
    
    // Check that dragged element has no borders or box shadow
    const draggedElement = page.locator('.task-item.dragging');
    await expect(draggedElement).toHaveCSS('border', 'none');
    await expect(draggedElement).toHaveCSS('box-shadow', 'none');
    await expect(draggedElement).toHaveCSS('outline', 'none');
    
    // Complete the drag
    await page.mouse.up();
  });

  test('should remove selection styling during drag', async ({ page }) => {
    const firstTask = page.locator('.task-item').first();
    
    // Select the task first
    await firstTask.click();
    await expect(firstTask).toHaveClass(/selected/);
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    
    // Check that selection styling is removed during drag
    const draggedElement = page.locator('.task-item.dragging');
    await expect(draggedElement).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)'); // transparent
    
    // Complete the drag
    await page.mouse.up();
  });

  test('should show drop indicators at different positions', async ({ page }) => {
    const tasks = page.locator('.task-item');
    await expect(tasks).toHaveCount.greaterThan(2);
    
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
    const tasks = page.locator('.task-item');
    await expect(tasks).toHaveCount.greaterThan(2);
    
    // Select multiple tasks using Ctrl+click
    await tasks.first().click();
    await tasks.nth(1).click({ modifiers: ['Meta'] }); // Use Meta for macOS
    
    // Verify multi-selection
    await expect(page.locator('.task-item.selected')).toHaveCount(2);
    
    // Start dragging one of the selected tasks
    await tasks.first().hover();
    await page.mouse.down();
    
    // Move to another position
    await tasks.nth(2).hover();
    
    // Check that drop indicator appears
    const dropIndicator = page.locator('.drop-indicator');
    await expect(dropIndicator).toBeVisible();
    
    // Check for multi-drag badge
    const multiBadge = page.locator('.multi-drag-badge');
    await expect(multiBadge).toBeVisible();
    
    // Complete the drag
    await page.mouse.up();
    await expect(dropIndicator).toHaveCount(0);
  });

  test('should position drop indicator at full width', async ({ page }) => {
    const tasks = page.locator('.task-item');
    const firstTask = tasks.first();
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    await tasks.nth(1).hover();
    
    // Check that drop indicator spans full width
    const dropIndicator = page.locator('.drop-indicator');
    await expect(dropIndicator).toBeVisible();
    await expect(dropIndicator).toHaveCSS('width', '100%');
    
    // Complete the drag
    await page.mouse.up();
  });

  test('should instantly show and hide drop indicators', async ({ page }) => {
    const tasks = page.locator('.task-item');
    const firstTask = tasks.first();
    const secondTask = tasks.nth(1);
    
    // Start dragging
    await firstTask.hover();
    await page.mouse.down();
    
    // Move to second task and verify instant appearance
    await secondTask.hover();
    const dropIndicator = page.locator('.drop-indicator');
    await expect(dropIndicator).toBeVisible();
    
    // Move away and verify instant disappearance
    await page.mouse.move(0, 0);
    
    // Complete the drag and verify instant cleanup
    await page.mouse.up();
    await expect(dropIndicator).toHaveCount(0);
  });
});