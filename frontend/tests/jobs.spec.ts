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
    // First authenticate as admin user
    await auth.setupAuthenticatedSession('admin');
    
    // Create real test data with unique names
    const timestamp = Date.now();
    const client = await dataFactory.createClient({ name: `Test Client ${timestamp}` });
    const job = await dataFactory.createJob({
      title: `Test Job ${timestamp}`,
      description: 'Test job description',
      status: 'in_progress',
      priority: 'high',
      client_id: client.id
    });

    console.log(`Created job with ID: ${job.id}`);
    
    // Wait a moment for the job to be fully created
    await page.waitForTimeout(1000);

    await page.goto('/jobs?scope=all');
    
    // Wait for SvelteKit to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for Svelte components to render
    await page.waitForTimeout(2000);

    // Debug: Check what page we're actually on
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Debug: Check if we see any content
    const h1Content = await page.locator('h1').first().textContent().catch(() => null);
    console.log('H1 content:', h1Content);
    
    // Debug: Check page content
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 1000));

    // If we're redirected to login, handle authentication via UI
    if (currentUrl.includes('/login')) {
      console.log('Redirected to login, authenticating via UI...');
      await auth.loginAsTestUserViaUI('admin');
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
    }

    // Check page title
    await expect(page.locator('h1')).toContainText('Jobs');

    // Debug: Check what the API returns (using authenticated session)
    const cookies = await page.context().cookies();
    console.log('Page cookies:', cookies.map(c => `${c.name}=${c.value}`));
    
    const apiResponse = await page.request.get('http://localhost:3001/api/v1/jobs?scope=all', {
      headers: { 
        'Accept': 'application/json',
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    });
    const apiData = await apiResponse.json();
    console.log('API Response status:', apiResponse.status());
    console.log('API Response data:', JSON.stringify(apiData, null, 2));
    
    // Check if our specific job exists
    const specificJobResponse = await page.request.get(`http://localhost:3001/api/v1/jobs/${job.id}`, {
      headers: { 
        'Accept': 'application/json',
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    });
    console.log('Specific job response status:', specificJobResponse.status());
    if (specificJobResponse.ok()) {
      const specificJobData = await specificJobResponse.json();
      console.log('Specific job data:', JSON.stringify(specificJobData, null, 2));
    }

    // Check if there are jobs or empty state
    const hasJobs = page.locator('.job-card-inline');
    const hasEmptyState = page.locator('.empty-state');
    
    const jobCount = await hasJobs.count();
    const emptyStateVisible = await hasEmptyState.isVisible();
    
    console.log(`Job cards found: ${jobCount}`);
    console.log(`Empty state visible: ${emptyStateVisible}`);
    
    if (jobCount > 0) {
      // Wait for the job card to appear
      await expect(page.locator('.job-card-inline')).toBeVisible({ timeout: 5000 });
    } else {
      console.log('No job cards found, checking if empty state is shown...');
      await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 });
      // This is expected if the created job isn't returned by the API - let's investigate why
      throw new Error(`Created job with ID ${job.id} but API returned ${apiData.data?.length || 0} jobs`);
    }

    // Check job card contains all required elements
    const jobCard = page.locator('.job-card-inline').first();
    
    // Check status emoji is present  
    await expect(jobCard.locator('.job-status-emoji')).toBeVisible();
    // Note: exact emoji content depends on configuration, just check it exists
    
    // Check client name is displayed (in Svelte it's within the client-link)
    await expect(jobCard.locator('.client-link')).toContainText(`Test Client ${timestamp}`);
    
    // Check job title is displayed
    await expect(jobCard.locator('.job-name')).toContainText(`Test Job ${timestamp}`);
    
    // Check priority emoji for high priority (should be visible for high priority)
    await expect(jobCard.locator('.job-priority-emoji')).toBeVisible();
  });

  test('should display loading skeleton while fetching', async ({ page }) => {
    // Add a delay to the real API to see loading state
    await page.route('**/api/v1/jobs*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/jobs');

    // Should show loading skeleton initially
    await expect(page.locator('[data-testid="job-card-skeleton"]')).toBeVisible();
  });

  test('should display empty state when no jobs', async ({ page }) => {
    // Capture network requests to verify correct port usage
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Don't create any jobs, so the database will be empty
    await page.goto('/jobs');
    
    // Wait for page to load and requests to complete
    await page.waitForLoadState('networkidle');
    
    // Debug: Print all API requests made and verify correct port
    console.log('API requests made:');
    requests.forEach(req => {
      console.log(`  ${req}`);
      if (req.includes('localhost:3000')) {
        console.error('ERROR: Request made to wrong port 3000!');
      } else if (req.includes('localhost:3001')) {
        console.log('✅ Request made to correct port 3001');
      }
    });

    // Check if we can manually verify the API works
    const apiResponse = await page.request.get('http://localhost:3001/api/v1/jobs');
    console.log('Direct API test status:', apiResponse.status());
    console.log('Direct API test response:', await apiResponse.json());

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
    const timestamp = Date.now();
    const client = await dataFactory.createClient({ name: `Mobile Test Client ${timestamp}` });
    const job = await dataFactory.createJob({
      title: `Mobile Test Job ${timestamp}`,
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
    const timestamp = Date.now();
    const client = await dataFactory.createClient({ name: `Navigation Test Client ${timestamp}` });
    const job = await dataFactory.createJob({
      title: `Navigation Test Job ${timestamp}`,
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