import { test, expect } from '@playwright/test';

test.describe('Jobs List Page (SVELTE-005)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API response for jobs
    await page.route('**/api/v1/jobs*', async route => {
      const mockResponse = {
        data: [
          {
            id: 'job-1',
            type: 'jobs',
            attributes: {
              title: 'Install Security System',
              description: 'Install comprehensive security system',
              status: 'in_progress',
              priority: 'high',
              due_on: '2024-01-15',
              due_time: '14:00:00',
              created_at: '2024-01-10T10:00:00Z',
              updated_at: '2024-01-12T15:30:00Z',
              status_label: 'In Progress',
              priority_label: 'High',
              is_overdue: false,
              task_counts: {
                total: 5,
                completed: 2,
                pending: 2,
                in_progress: 1
              }
            },
            relationships: {
              client: { data: { id: 'client-1', type: 'clients' } },
              created_by: { data: { id: 'user-1', type: 'users' } },
              technicians: { data: [{ id: 'user-2', type: 'users' }] },
              tasks: { data: [] }
            }
          }
        ],
        included: [
          {
            id: 'client-1',
            type: 'clients',
            attributes: {
              name: 'Acme Corporation',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-05T10:00:00Z'
            }
          },
          {
            id: 'user-2',
            type: 'users',
            attributes: {
              name: 'John Smith',
              email: 'john@example.com',
              role: 'technician',
              initials: 'JS',
              avatar_style: 'background-color: #007AFF;',
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z'
            }
          }
        ],
        meta: {
          total: 1,
          page: 1,
          per_page: 20,
          total_pages: 1
        },
        links: {}
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });
  });

  test('should display jobs list with proper structure', async ({ page }) => {
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
    
    // Check technician avatar with initials
    await expect(jobCard.locator('.technician-avatar')).toBeVisible();
    await expect(jobCard.locator('.technician-avatar')).toContainText('JS');
    
    // Check priority emoji for high priority
    await expect(jobCard.locator('.job-priority-emoji')).toContainText('⬆️');
  });

  test('should display loading skeleton while fetching', async ({ page }) => {
    // Delay the API response to see loading state
    await page.route('**/api/v1/jobs*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/jobs');

    // Should show loading skeleton initially
    await expect(page.locator('text=Loading')).toBeVisible();
  });

  test('should display empty state when no jobs', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/jobs*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          included: [],
          meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
          links: {}
        })
      });
    });

    await page.goto('/jobs');

    // Should show empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No jobs found')).toBeVisible();
    await expect(page.locator('text=📋')).toBeVisible(); // Empty state icon
  });

  test('should display error state when API fails', async ({ page }) => {
    // Mock API error
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
        // Subsequent requests succeed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            included: [],
            meta: { total: 0, page: 1, per_page: 20, total_pages: 0 },
            links: {}
          })
        });
      }
    });

    await page.goto('/jobs');

    // Should show error state initially
    await expect(page.locator('.error-state')).toBeVisible();
    
    // Click retry button
    await page.click('button:has-text("Try Again")');
    
    // Should show success state after retry
    await expect(page.locator('.empty-state')).toBeVisible();
    expect(requestCount).toBe(2);
  });

  test('should be responsive on mobile', async ({ page }) => {
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
    await page.goto('/jobs');

    // Wait for job card to load
    const jobCard = page.locator('.job-card-inline').first();
    await expect(jobCard).toBeVisible();

    // Check that job card has the correct href
    await expect(jobCard).toHaveAttribute('href', '/jobs/job-1');
    
    // Check that job card has preload data attribute
    await expect(jobCard).toHaveAttribute('data-sveltekit-preload-data', 'hover');
  });
});