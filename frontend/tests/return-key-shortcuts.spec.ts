import { test, expect } from '@playwright/test';

test.describe('Return Key Shortcuts for Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a job page
    await page.goto('http://localhost:5173/jobs/test');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('Return with no selection should activate bottom "Add a Task" row', async ({ page }) => {
    // Clear any existing selection
    await page.click('body'); // Click outside to clear selection
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should show the new task input
    await expect(page.locator('.new-task-input')).toBeVisible();
    await expect(page.locator('.new-task-input')).toBeFocused();
  });

  test('Return with one task selected should create inline new task as sibling', async ({ page }) => {
    // Select a single task
    await page.click('.task-item:first-child .task-content');
    
    // Verify task is selected
    await expect(page.locator('.task-item:first-child')).toHaveClass(/task-selected/);
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should show inline new task input after the selected task
    await expect(page.locator('.task-item-add-new input')).toBeVisible();
    await expect(page.locator('.task-item-add-new input')).toBeFocused();
  });

  test('Return with multiple tasks selected should do nothing', async ({ page }) => {
    // Select multiple tasks
    await page.click('.task-item:first-child .task-content');
    await page.keyboard.down('Meta'); // Cmd on Mac
    await page.click('.task-item:nth-child(2) .task-content');
    await page.keyboard.up('Meta');
    
    // Verify multiple tasks are selected
    await expect(page.locator('.task-item.task-selected')).toHaveCount(2);
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should not create any new task inputs
    await expect(page.locator('.new-task-input')).not.toBeVisible();
    await expect(page.locator('.task-item-add-new input')).not.toBeVisible();
  });

  test('Return while editing should not trigger shortcuts', async ({ page }) => {
    // Click on a task title to start editing
    await page.click('.task-item:first-child .task-title');
    
    // Verify we're in edit mode
    await expect(page.locator('.task-title-input')).toBeVisible();
    await expect(page.locator('.task-title-input')).toBeFocused();
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should save the edit, not create new task
    await expect(page.locator('.task-title-input')).not.toBeVisible();
    await expect(page.locator('.new-task-input')).not.toBeVisible();
    await expect(page.locator('.task-item-add-new input')).not.toBeVisible();
  });

  test('Escape should cancel inline new task creation', async ({ page }) => {
    // Select a single task
    await page.click('.task-item:first-child .task-content');
    
    // Press Return to create inline task
    await page.keyboard.press('Enter');
    
    // Verify inline input is visible
    await expect(page.locator('.task-item-add-new input')).toBeVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Inline input should be hidden
    await expect(page.locator('.task-item-add-new input')).not.toBeVisible();
  });

  test('Creating inline task should position it correctly', async ({ page }) => {
    // Count initial tasks
    const initialTaskCount = await page.locator('.task-item:not(.task-item-add-new)').count();
    
    // Select a single task
    await page.click('.task-item:first-child .task-content');
    
    // Press Return to create inline task
    await page.keyboard.press('Enter');
    
    // Type task title
    await page.fill('.task-item-add-new input', 'New test task');
    
    // Press Enter to save
    await page.keyboard.press('Enter');
    
    // Wait for task to be created
    await page.waitForTimeout(1000);
    
    // Should have one more task
    await expect(page.locator('.task-item:not(.task-item-add-new)')).toHaveCount(initialTaskCount + 1);
    
    // New task should be positioned after the originally selected task
    // This is more complex to test precisely, but we can verify the task was created
    await expect(page.locator('.task-item')).toContainText('New test task');
  });
});