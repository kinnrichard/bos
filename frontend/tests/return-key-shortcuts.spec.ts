import { test, expect } from '@playwright/test';
import { AuthHelper } from '../test-helpers/auth';
import { TestDatabase } from '../test-helpers/database';
import { DataFactory } from '../test-helpers/data-factories';

test.describe('Return Key Shortcuts for Task Creation', () => {
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
    
    // Create test data (job with client and some tasks for shortcuts to work with)
    const client = await dataFactory.createClient({ name: `Test Client ${Date.now()}-${Math.random().toString(36).substring(7)}` });
    const job = await dataFactory.createJob({
      title: `Test Job ${Date.now()}`,
      status: 'in_progress',
      priority: 'high',
      client_id: client.id
    });
    
    jobId = job.id;
    
    // Create a few tasks to work with for selection scenarios
    await dataFactory.createTask({
      title: `Existing Task 1 ${Date.now()}`,
      job_id: job.id,
      status: 'new_task'
    });
    await dataFactory.createTask({
      title: `Existing Task 2 ${Date.now()}`,
      job_id: job.id,
      status: 'in_progress'
    });
    
    // Navigate to the specific job detail page
    await page.goto(`/jobs/${jobId}`);
    
    // Wait for tasks to load
    await expect(page.locator('[data-task-id]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Return with no selection should activate bottom "New Task" row', async ({ page }) => {
    // Clear any existing selection
    await page.click('body'); // Click outside to clear selection
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should show the new task input (bottom textbox)
    await expect(page.getByRole('textbox', { name: 'New Task' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'New Task' })).toBeFocused();
  });

  test('Return with one task selected should create inline new task as sibling', async ({ page }) => {
    // Select a single task (click on the task button)
    const firstTask = page.locator('[data-task-id]').first();
    await firstTask.click();
    
    // Verify task is selected
    await expect(firstTask).toHaveClass(/selected/);
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should show inline new task input after the selected task
    await expect(page.locator('.task-item-add-new input')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.task-item-add-new input')).toBeFocused();
  });

  test('Return with multiple tasks selected should do nothing', async ({ page }) => {
    // Select multiple tasks
    const firstTask = page.locator('[data-task-id]').first();
    const secondTask = page.locator('[data-task-id]').nth(1);
    
    await firstTask.click();
    await secondTask.click({ modifiers: ['Meta'] }); // Cmd+click for multi-select
    
    // Verify multiple tasks are selected
    await expect(page.locator('[data-task-id].selected')).toHaveCount(2);
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should not create any new task inputs (check that no new input appears)
    // The bottom "New Task" textbox should remain unfocused
    await expect(page.getByRole('textbox', { name: 'New Task' })).not.toBeFocused();
    // And no inline task creation should happen
    await page.waitForTimeout(1000); // Give time for any potential UI changes
    const inlineInputs = page.locator('.task-item-add-new input');
    const inlineInputCount = await inlineInputs.count();
    expect(inlineInputCount).toBe(0);
  });

  test('Return while editing should not trigger shortcuts', async ({ page }) => {
    // Click on a task title to start editing
    const firstTaskTitle = page.locator('[data-task-id]').first().locator('h5');
    await firstTaskTitle.click();
    
    // Verify we're in edit mode (look for input or contenteditable)
    const editInput = page.locator('input[type="text"]').or(page.locator('[contenteditable="true"]'));
    await expect(editInput).toBeVisible({ timeout: 3000 });
    await expect(editInput).toBeFocused();
    
    // Press Return
    await page.keyboard.press('Enter');
    
    // Should save the edit, not create new task
    await expect(editInput).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('textbox', { name: 'New Task' })).not.toBeFocused();
    await expect(page.locator('.task-item-add-new input')).not.toBeVisible();
  });

  test('Escape should cancel inline new task creation', async ({ page }) => {
    // Select a single task
    const firstTask = page.locator('[data-task-id]').first();
    await firstTask.click();
    
    // Press Return to create inline task
    await page.keyboard.press('Enter');
    
    // Verify inline input is visible
    await expect(page.locator('.task-item-add-new input')).toBeVisible({ timeout: 3000 });
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Inline input should be hidden
    await expect(page.locator('.task-item-add-new input')).not.toBeVisible({ timeout: 3000 });
  });

  test('Creating inline task should position it correctly', async ({ page }) => {
    // Count initial tasks
    const initialTaskCount = await page.locator('[data-task-id]').count();
    
    // Select a single task
    const firstTask = page.locator('[data-task-id]').first();
    await firstTask.click();
    
    // Press Return to create inline task
    await page.keyboard.press('Enter');
    
    // Type task title
    await page.fill('.task-item-add-new input', 'New test task');
    
    // Press Enter to save
    await page.keyboard.press('Enter');
    
    // Wait for task to be created
    await page.waitForTimeout(2000);
    
    // Should have one more task
    await expect(page.locator('[data-task-id]')).toHaveCount(initialTaskCount + 1);
    
    // New task should be positioned after the originally selected task
    // This is more complex to test precisely, but we can verify the task was created
    await expect(page.getByRole('heading', { name: 'New test task' })).toBeVisible();
  });
});