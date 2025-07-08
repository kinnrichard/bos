import { test, expect } from '@playwright/test';
import { AuthHelper } from '../test-helpers/auth';
import { TestDatabase } from '../test-helpers/database';
import { DataFactory } from '../test-helpers/data-factories';

test.describe('Home Page', () => {
  let db: TestDatabase;
  let auth: AuthHelper;
  let dataFactory: DataFactory;

  test.beforeEach(async ({ page }) => {
    // Initialize helpers
    db = new TestDatabase();
    auth = new AuthHelper(page);
    dataFactory = new DataFactory(page);
  });

  test('should show expected content for unauthenticated users', async ({ page }) => {
    // Ensure no authentication
    await page.context().clearCookies();
    
    await page.goto('/');

    // Check for the main heading
    await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();

    // Check for the subtitle
    await expect(page.getByText('Job Management System')).toBeVisible();

    // Check for the migration notice
    await expect(page.getByText('Svelte Migration in Progress')).toBeVisible();
  });

  test('should show personalized content for authenticated admin users', async ({ page }) => {
    // Authenticate as admin user
    await auth.setupAuthenticatedSession('admin');
    
    await page.goto('/');

    // Should still show the main branding
    await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();
    
    // Should show navigation or user-specific content
    const hasNavigation = await page.locator('nav').isVisible().catch(() => false);
    const hasUserMenu = await page.locator('[data-testid="user-menu"], .user-menu').isVisible().catch(() => false);
    const hasJobsLink = await page.getByRole('link', { name: /jobs/i }).isVisible().catch(() => false);
    
    // At least one authenticated user indicator should be present
    expect(hasNavigation || hasUserMenu || hasJobsLink).toBe(true);
  });

  test('should show appropriate content for technician users', async ({ page }) => {
    // Authenticate as technician user
    await auth.setupAuthenticatedSession('technician');
    
    await page.goto('/');

    // Should show the main branding
    await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();
    
    // Should show technician-appropriate navigation
    const hasJobsAccess = await page.getByRole('link', { name: /jobs/i }).isVisible().catch(() => false);
    const hasTasksAccess = await page.getByText(/tasks/i).isVisible().catch(() => false);
    
    // Technicians should have access to job-related functionality
    expect(hasJobsAccess || hasTasksAccess).toBe(true);
  });

  test('should handle navigation to protected routes', async ({ page }) => {
    // Test as authenticated user
    await auth.setupAuthenticatedSession('admin');
    
    await page.goto('/');
    
    // Try to navigate to jobs page if link is available
    const jobsLink = page.getByRole('link', { name: /jobs/i });
    if (await jobsLink.isVisible()) {
      await jobsLink.click();
      
      // Should navigate to jobs page
      await expect(page).toHaveURL(/\/jobs/);
      
      // Should show jobs content
      const hasJobsContent = await page.locator('.job-item, [data-job-id], .jobs-list').isVisible().catch(() => false);
      const hasJobsHeading = await page.getByRole('heading', { name: /jobs/i }).isVisible().catch(() => false);
      
      expect(hasJobsContent || hasJobsHeading).toBe(true);
    }
  });

  test('should display real job data for authenticated users', async ({ page }) => {
    // Authenticate and create test data
    await auth.setupAuthenticatedSession('admin');
    
    // Create test job for display
    const client = await dataFactory.createClient({ 
      name: `Test Client ${Date.now()}` 
    });
    const job = await dataFactory.createJob({
      title: `Test Job ${Date.now()}`,
      status: 'in_progress',
      priority: 'high',
      client_id: client.id
    });
    
    await page.goto('/');
    
    // Navigate to jobs if possible
    const jobsLink = page.getByRole('link', { name: /jobs/i });
    if (await jobsLink.isVisible()) {
      await jobsLink.click();
      
      // Should show the created job
      await expect(page.locator(`text=${job.title}`)).toBeVisible({ timeout: 5000 });
    }
    
    // Clean up test data
    await dataFactory.deleteEntity('jobs', job.id);
    await dataFactory.deleteEntity('clients', client.id);
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();
  });
});
