import { test, expect } from '@playwright/test';

test.describe('Task Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a job page with tasks
    await page.goto('/jobs/1'); // Assuming job with ID 1 exists
    
    // Wait for task list to load
    await page.waitForSelector('.task-list');
  });

  test('should show delete confirmation modal when delete key is pressed with selected task', async ({ page }) => {
    // Find and click on a task to select it
    const firstTask = page.locator('.task-item').first();
    await firstTask.click();
    
    // Verify task is selected
    await expect(firstTask).toHaveClass(/selected/);
    
    // Press delete key
    await page.keyboard.press('Delete');
    
    // Verify delete confirmation modal appears
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('.modal-container')).toBeVisible();
    await expect(page.locator('h3')).toContainText('Delete Task');
    
    // Verify warning message is shown
    await expect(page.locator('.warning-text')).toContainText('This action cannot be undone');
  });

  test('should handle multiple task deletion', async ({ page }) => {
    // Select multiple tasks using Cmd/Ctrl+click
    const tasks = page.locator('.task-item');
    
    // Click first task
    await tasks.nth(0).click();
    
    // Cmd/Ctrl+click second task to add to selection
    await tasks.nth(1).click({ modifiers: ['Meta'] }); // Meta for macOS, could also use 'ControlOrMeta'
    
    // Press delete key
    await page.keyboard.press('Delete');
    
    // Verify modal shows multiple task deletion
    await expect(page.locator('h3')).toContainText('Delete 2 Tasks');
    await expect(page.locator('.modal-body p')).toContainText('these 2 tasks');
  });

  test('should close modal when cancel is clicked', async ({ page }) => {
    // Select a task and open delete modal
    const firstTask = page.locator('.task-item').first();
    await firstTask.click();
    await page.keyboard.press('Delete');
    
    // Click cancel button
    await page.locator('.button--secondary').click();
    
    // Verify modal is closed
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
  });

  test('should close modal when escape key is pressed', async ({ page }) => {
    // Select a task and open delete modal
    const firstTask = page.locator('.task-item').first();
    await firstTask.click();
    await page.keyboard.press('Delete');
    
    // Press escape key
    await page.keyboard.press('Escape');
    
    // Verify modal is closed
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
  });

  test('should delete task when confirm button is clicked', async ({ page }) => {
    // Get initial task count
    const initialTaskCount = await page.locator('.task-item:not(.task-item-add-new)').count();
    
    // Select a task and open delete modal
    const firstTask = page.locator('.task-item:not(.task-item-add-new)').first();
    const taskTitle = await firstTask.locator('.task-title').textContent();
    await firstTask.click();
    await page.keyboard.press('Delete');
    
    // Click delete button
    await page.locator('.button--danger').click();
    
    // Wait for deletion to complete and modal to close
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
    
    // Verify task count decreased
    await expect(page.locator('.task-item:not(.task-item-add-new)')).toHaveCount(initialTaskCount - 1);
    
    // Verify the specific task is no longer visible
    await expect(page.locator('.task-title', { hasText: taskTitle || '' })).not.toBeVisible();
    
    // Verify success message is shown
    await expect(page.locator('.feedback-message')).toContainText('Successfully deleted');
  });

  test('should not show delete modal when no tasks are selected', async ({ page }) => {
    // Ensure no tasks are selected by clicking outside
    await page.locator('.task-list').click();
    
    // Press delete key
    await page.keyboard.press('Delete');
    
    // Verify modal does not appear
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
  });

  test('should work with Backspace key as well as Delete key', async ({ page }) => {
    // Select a task
    const firstTask = page.locator('.task-item').first();
    await firstTask.click();
    
    // Press backspace key instead of delete
    await page.keyboard.press('Backspace');
    
    // Verify delete confirmation modal appears
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('h3')).toContainText('Delete Task');
  });
});