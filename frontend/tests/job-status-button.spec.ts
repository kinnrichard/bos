import { test, expect } from '@playwright/test';

test.describe('Job Status Button Component', () => {
  test.beforeEach(async ({ page }) => {
    // Mock CSRF token endpoint
    await page.route('**/api/v1/csrf_token', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrf_token: 'mock-csrf-token' })
      });
    });

    // Mock the job detail API response for any job ID
    await page.route('**/api/v1/jobs/*', async route => {
      const mockResponse = {
        data: {
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
            is_overdue: false
          },
          relationships: {
            client: { data: { id: 'client-1', type: 'clients' } },
            created_by: { data: { id: 'user-1', type: 'users' } },
            technicians: { data: [{ id: 'user-2', type: 'users' }] },
            tasks: { data: [] }
          }
        },
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
        ]
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });
  });

  test('should display job status button with correct emoji', async ({ page }) => {
    await page.goto('/jobs/job-1');

    // Wait for job status button to appear
    const statusButton = page.locator('.job-status-button');
    await expect(statusButton).toBeVisible();

    // Check that it shows the correct emoji for in_progress status
    await expect(statusButton.locator('.job-status-emoji')).toContainText('🟢');

    // Check button has proper accessibility attributes
    await expect(statusButton).toHaveAttribute('title', 'Job Status');
  });

  test('should open popover when status button is clicked', async ({ page }) => {
    await page.goto('/jobs/job-1');

    // Click the job status button
    const statusButton = page.locator('.job-status-button');
    await statusButton.click();

    // Check that popover panel appears
    const statusPanel = page.locator('.job-status-panel');
    await expect(statusPanel).toBeVisible();

    // Check that popover contains title
    await expect(statusPanel.locator('.status-title')).toContainText('Job Status');

    // Check that all status options are displayed
    const statusOptions = page.locator('.status-option');
    await expect(statusOptions).toHaveCount(7);

    // Check that status options contain correct labels
    await expect(page.locator('.status-option:has-text("Open")')).toBeVisible();
    await expect(page.locator('.status-option:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('.status-option:has-text("Paused")')).toBeVisible();
    await expect(page.locator('.status-option:has-text("Waiting for Customer")')).toBeVisible();
    await expect(page.locator('.status-option:has-text("Scheduled")')).toBeVisible();
    await expect(page.locator('.status-option:has-text("Completed")')).toBeVisible();
    await expect(page.locator('.status-option:has-text("Cancelled")')).toBeVisible();
  });

  test('should highlight current status option', async ({ page }) => {
    await page.goto('/jobs/job-1');

    // Open the status popover
    await page.locator('.job-status-button').click();

    // Check that current status (in_progress) is highlighted
    const currentOption = page.locator('.status-option.current');
    await expect(currentOption).toBeVisible();
    await expect(currentOption).toContainText('In Progress');
    await expect(currentOption.locator('.current-indicator')).toContainText('✓');

    // Check that other options are not highlighted
    const openOption = page.locator('.status-option:has-text("Open")');
    await expect(openOption).not.toHaveClass(/current/);
  });

  test('should display status emojis correctly', async ({ page }) => {
    await page.goto('/jobs/job-1');

    // Open the status popover
    await page.locator('.job-status-button').click();

    // Check that each status option has the correct emoji
    await expect(page.locator('.status-option:has-text("Open") .status-emoji')).toContainText('⚫');
    await expect(page.locator('.status-option:has-text("In Progress") .status-emoji')).toContainText('🟢');
    await expect(page.locator('.status-option:has-text("Paused") .status-emoji')).toContainText('⏸️');
    await expect(page.locator('.status-option:has-text("Waiting for Customer") .status-emoji')).toContainText('⏳');
    await expect(page.locator('.status-option:has-text("Scheduled") .status-emoji')).toContainText('📅');
    await expect(page.locator('.status-option:has-text("Completed") .status-emoji')).toContainText('✅');
    await expect(page.locator('.status-option:has-text("Cancelled") .status-emoji')).toContainText('❌');
  });

  test('should update job status successfully', async ({ page }) => {
    let statusUpdateCalled = false;
    
    // Mock the status update API call
    await page.route('**/api/v1/jobs/*', async route => {
      if (route.request().method() === 'PATCH') {
        statusUpdateCalled = true;
        const requestBody = await route.request().postData();
        const parsedBody = JSON.parse(requestBody || '{}');
        
        // Verify the request structure
        expect(parsedBody.job.status).toBe('paused');
        
        // Return updated job with new status
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'job-1',
              type: 'jobs',
              attributes: {
                title: 'Install Security System',
                description: 'Install comprehensive security system',
                status: 'paused',
                priority: 'high',
                due_on: '2024-01-15',
                due_time: '14:00:00',
                created_at: '2024-01-10T10:00:00Z',
                updated_at: '2024-01-12T15:30:00Z',
                status_label: 'Paused',
                priority_label: 'High',
                is_overdue: false
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/jobs/job-1');

    // Open status popover
    await page.locator('.job-status-button').click();

    // Click on "Paused" status
    await page.locator('.status-option:has-text("Paused")').click();

    // Check that popover closes
    await expect(page.locator('.job-status-panel')).not.toBeVisible();

    // Wait for status to update and check that button shows new emoji
    await expect(page.locator('.job-status-button .job-status-emoji')).toContainText('⏸️');

    // Verify API was called
    expect(statusUpdateCalled).toBe(true);
  });

  test('should show loading state during status update', async ({ page }) => {
    // Mock delayed API response
    await page.route('**/api/v1/jobs/*', async route => {
      if (route.request().method() === 'PATCH') {
        // Add delay to see loading state
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'job-1',
              type: 'jobs',
              attributes: {
                status: 'completed'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/jobs/job-1');

    // Open status popover
    await page.locator('.job-status-button').click();

    // Click on "Completed" status
    await page.locator('.status-option:has-text("Completed")').click();

    // Should briefly show loading indicator
    await expect(page.locator('.loading-indicator')).toBeVisible();
    await expect(page.locator('.loading-indicator')).toContainText('Updating status...');

    // Status options should be disabled during loading
    await expect(page.locator('.status-options.loading')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/v1/jobs/*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/jobs/job-1');

    // Open status popover
    await page.locator('.job-status-button').click();

    // Click on "Completed" status
    await page.locator('.status-option:has-text("Completed")').click();

    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Failed to update status - please try again');

    // Status should remain unchanged (rollback)
    await expect(page.locator('.job-status-button .job-status-emoji')).toContainText('🟢');
  });

  test('should handle CSRF token errors', async ({ page }) => {
    // Mock CSRF error response
    await page.route('**/api/v1/jobs/*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'CSRF token mismatch', code: 'INVALID_CSRF_TOKEN' })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/jobs/job-1');

    // Open status popover and attempt status change
    await page.locator('.job-status-button').click();
    await page.locator('.status-option:has-text("Paused")').click();

    // Should show CSRF-specific error message
    await expect(page.locator('.error-message')).toContainText('Session expired - please try again');
  });

  test('should perform optimistic updates', async ({ page }) => {
    // Mock slow API response to test optimistic updates
    await page.route('**/api/v1/jobs/*', async route => {
      if (route.request().method() === 'PATCH') {
        await new Promise(resolve => setTimeout(resolve, 200));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'job-1',
              type: 'jobs',
              attributes: { status: 'completed' }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/jobs/job-1');

    // Verify initial status
    await expect(page.locator('.job-status-button .job-status-emoji')).toContainText('🟢');

    // Change status
    await page.locator('.job-status-button').click();
    await page.locator('.status-option:has-text("Completed")').click();

    // Should immediately show new status (optimistic update)
    await expect(page.locator('.job-status-button .job-status-emoji')).toContainText('✅');
  });

  test('should close popover when clicking outside', async ({ page }) => {
    await page.goto('/jobs/job-1');

    // Open status popover
    await page.locator('.job-status-button').click();
    await expect(page.locator('.job-status-panel')).toBeVisible();

    // Click outside the popover
    await page.click('body', { position: { x: 100, y: 100 } });

    // Popover should close
    await expect(page.locator('.job-status-panel')).not.toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/jobs/job-1');

    // Tab to the status button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need multiple tabs depending on page structure
    
    // Status button should be focused
    await expect(page.locator('.job-status-button')).toBeFocused();

    // Press Enter to open popover
    await page.keyboard.press('Enter');
    await expect(page.locator('.job-status-panel')).toBeVisible();

    // Press Escape to close popover
    await page.keyboard.press('Escape');
    await expect(page.locator('.job-status-panel')).not.toBeVisible();
  });

  test('should not change status when clicking same status', async ({ page }) => {
    let apiCallCount = 0;
    
    await page.route('**/api/v1/jobs/*', async route => {
      if (route.request().method() === 'PATCH') {
        apiCallCount++;
      }
      await route.continue();
    });

    await page.goto('/jobs/job-1');

    // Open popover and click current status
    await page.locator('.job-status-button').click();
    await page.locator('.status-option.current').click();

    // Should close popover without API call
    await expect(page.locator('.job-status-panel')).not.toBeVisible();
    expect(apiCallCount).toBe(0);
  });

  test('should work correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/jobs/job-1');

    // Status button should be visible and appropriately sized
    const statusButton = page.locator('.job-status-button');
    await expect(statusButton).toBeVisible();
    
    const buttonBox = await statusButton.boundingBox();
    expect(buttonBox?.width).toBe(36); // Should maintain size on mobile
    expect(buttonBox?.height).toBe(36);

    // Popover should be responsive
    await statusButton.click();
    const statusPanel = page.locator('.job-status-panel');
    await expect(statusPanel).toBeVisible();
    
    const panelBox = await statusPanel.boundingBox();
    expect(panelBox?.width).toBeLessThanOrEqual(200); // Should fit on mobile screen
  });
});