import { test, expect } from '@playwright/test';
import { TestDatabase } from '../test-helpers/database';
import { AuthHelper } from '../test-helpers/auth';
import { DataFactory } from '../test-helpers/data-factories';

test.describe('Jobs List Page (SVELTE-005)', () => {
  let db: TestDatabase;
  let auth: AuthHelper;
  let dataFactory: DataFactory;

  test.beforeEach(async ({ page }) => {
    // Initialize helpers for real database testing
    db = new TestDatabase();
    auth = new AuthHelper(page);
    dataFactory = new DataFactory(page);
  });

  test('should display jobs list with proper structure', async ({ page }) => {
    // Create real test data
    const client = await dataFactory.createClient({ name: 'Acme Corporation' });
    const job = await dataFactory.createJob({
      title: 'Install Security System',
      description: 'Install comprehensive security system',
      status: 'in_progress',
      priority: 'high',
      client_id: client.id
    });

    await page.goto('/jobs');

    // Check page title
    await expect(page.locator('h1')).toContainText('Jobs');

    // Wait for the job card to appear
    await expect(page.locator('.job-card-inline')).toBeVisible();

    // Check job card contains all required elements
    const jobCard = page.locator('.job-card-inline').first();
    
    // Check status emoji is present
    await expect(jobCard.locator('.job-status-emoji')).toBeVisible();
    await expect(jobCard.locator('.job-status-emoji')).toContainText('⚡'); // in_progress emoji
    
    // Check client name is displayed
    await expect(jobCard.locator('.client-name-prefix')).toContainText('Acme Corporation');
    
    // Check job title is displayed
    await expect(jobCard.locator('.job-name')).toContainText('Install Security System');
    
    // Check priority emoji for high priority
    await expect(jobCard.locator('.job-priority-emoji')).toContainText('⬆️');
  });

  test('should display loading skeleton while fetching', async ({ page }) => {
    // Add a delay to the real API to see loading state
    await page.route('**/api/v1/jobs*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/jobs');

    // Should show loading skeleton initially
    await expect(page.locator('text=Loading')).toBeVisible();
  });

  test('should display empty state when no jobs', async ({ page }) => {
    // Don't create any jobs, so the database will be empty
    await page.goto('/jobs');

    // Should show empty state (real API with no data)
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No jobs found')).toBeVisible();
    await expect(page.locator('text=📋')).toBeVisible(); // Empty state icon
  });

  test('should display error state when API fails', async ({ page }) => {
    // Mock API error on real endpoint
    await page.route('**/api/v1/jobs*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/jobs');

    // Should show error state
    await expect(page.locator('.error-state')).toBeVisible();
    await expect(page.locator('text=Unable to load jobs')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('should handle retry functionality', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/v1/jobs*', async route => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Network error' })
        });
      } else {
        // Subsequent requests succeed with real API response format
        await route.continue();
      }
    });

    await page.goto('/jobs');

    // Should show error state initially
    await expect(page.locator('.error-state')).toBeVisible();
    
    // Click retry button
    await page.click('button:has-text("Try Again")');
    
    // Should show success state after retry (empty since no jobs created)
    await expect(page.locator('.empty-state')).toBeVisible();
    expect(requestCount).toBe(2);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Create test data first
    const client = await dataFactory.createClient({ name: 'Mobile Test Client' });
    const job = await dataFactory.createJob({
      title: 'Mobile Test Job',
      client_id: client.id
    });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/jobs');

    // Wait for job card to load
    await expect(page.locator('.job-card-inline')).toBeVisible();

    // Check mobile responsive styling is applied
    const jobCard = page.locator('.job-card-inline').first();
    const box = await jobCard.boundingBox();
    
    // Job card should take most of screen width on mobile
    expect(box?.width).toBeGreaterThan(300);
    
    // Check that header actions are responsive
    await expect(page.locator('.page-header__actions')).toBeVisible();
  });

  test('job cards should be clickable and navigate correctly', async ({ page }) => {
    // Create test data first
    const client = await dataFactory.createClient({ name: 'Navigation Test Client' });
    const job = await dataFactory.createJob({
      title: 'Navigation Test Job',
      client_id: client.id
    });

    await page.goto('/jobs');

    // Wait for job card to load
    const jobCard = page.locator('.job-card-inline').first();
    await expect(jobCard).toBeVisible();

    // Check that job card has the correct href (using real job ID)
    await expect(jobCard).toHaveAttribute('href', `/jobs/${job.id}`);
    
    // Check that job card has preload data attribute
    await expect(jobCard).toHaveAttribute('data-sveltekit-preload-data', 'hover');
  });
});