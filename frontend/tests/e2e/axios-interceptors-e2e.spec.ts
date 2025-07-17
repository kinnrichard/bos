import { test, expect } from '@playwright/test';

test.describe('Axios Interceptors E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses and setup authentication
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          user: { id: 1, name: 'Test User' },
          csrf_token: 'initial-csrf-token'
        })
      });
    });

    await page.route('**/api/auth/csrf-token', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrf_token: 'refreshed-csrf-token' })
      });
    });
  });

  test.describe('Token Refresh During User Actions', () => {
    test('should handle token refresh seamlessly during task creation', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');
      
      // Mock initial API calls
      await page.route('**/api/jobs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jobs: [] })
        });
      });

      // Mock token expiry on first task creation attempt
      let requestCount = 0;
      await page.route('**/api/jobs/*/tasks', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request fails with 401
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          // Second request succeeds after token refresh
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ 
              task: { 
                id: 1, 
                title: 'Test Task', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'Test Task');
      await page.click('[data-testid="save-task-button"]');

      // Assert
      await expect(page.locator('[data-testid="task-list"]')).toContainText('Test Task');
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    test('should handle multiple concurrent requests with token refresh', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      // Mock multiple API endpoints to return 401 on first call
      const endpoints = [
        '/api/jobs/1/tasks',
        '/api/jobs/2/tasks',
        '/api/jobs/3/tasks'
      ];

      const requestCounts = new Map<string, number>();

      endpoints.forEach(endpoint => {
        requestCounts.set(endpoint, 0);
        page.route(`**${endpoint}`, async route => {
          const count = requestCounts.get(endpoint) || 0;
          requestCounts.set(endpoint, count + 1);

          if (count === 0) {
            // First request fails with 401
            await route.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Token expired' })
            });
          } else {
            // Subsequent requests succeed
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ 
                task: { 
                  id: count, 
                  title: `Task ${count}`, 
                  status: 'pending' 
                }
              })
            });
          }
        });
      });

      // Act - Trigger multiple simultaneous requests
      await Promise.all([
        page.click('[data-testid="create-task-job-1"]'),
        page.click('[data-testid="create-task-job-2"]'),
        page.click('[data-testid="create-task-job-3"]')
      ]);

      // Assert
      await expect(page.locator('[data-testid="task-list-job-1"]')).toContainText('Task');
      await expect(page.locator('[data-testid="task-list-job-2"]')).toContainText('Task');
      await expect(page.locator('[data-testid="task-list-job-3"]')).toContainText('Task');
    });

    test('should redirect to login when token refresh fails', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      // Mock token refresh to fail
      await page.route('**/api/auth/csrf-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Refresh failed' })
        });
      });

      // Mock API call to return 401
      await page.route('**/api/jobs/*/tasks', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' })
        });
      });

      // Act
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'Test Task');
      await page.click('[data-testid="save-task-button"]');

      // Assert
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('CSRF Token Error Handling', () => {
    test('should handle CSRF token errors gracefully', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request fails with CSRF error
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Invalid CSRF token',
              code: 'INVALID_CSRF_TOKEN'
            })
          });
        } else {
          // Second request succeeds with new token
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: 'New Job', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'New Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="job-list"]')).toContainText('New Job');
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });
  });

  test.describe('Rate Limiting Handling', () => {
    test('should handle rate limiting with user feedback', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request is rate limited
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: { 'retry-after': '2' },
            body: JSON.stringify({ error: 'Rate limit exceeded' })
          });
        } else {
          // Second request succeeds after waiting
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: 'Rate Limited Job', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Rate Limited Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="toast-message"]')).toContainText('Please wait');
      await expect(page.locator('[data-testid="job-list"]')).toContainText('Rate Limited Job');
    });
  });

  test.describe('Server Error Retry Logic', () => {
    test('should retry server errors with exponential backoff', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount <= 2) {
          // First two requests fail with server error
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          // Third request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: 'Retried Job', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Retried Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="job-list"]')).toContainText('Retried Job');
      expect(requestCount).toBe(3);
    });

    test('should give up after max retries', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        // Always fail with server error
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Persistent server error' })
        });
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Failed Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('server error');
      expect(requestCount).toBe(4); // Initial + 3 retries
    });
  });

  test.describe('Performance Tests', () => {
    test('should handle token refresh without noticeable delay', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      const startTime = Date.now();
      
      // Mock token refresh to complete quickly
      await page.route('**/api/auth/csrf-token', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ csrf_token: 'fast-refreshed-token' })
        });
      });

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: 'Fast Job', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Fast Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="job-list"]')).toContainText('Fast Job');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  test.describe('User Experience Tests', () => {
    test('should show loading state during token refresh', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      // Mock delayed token refresh
      await page.route('**/api/auth/csrf-token', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ csrf_token: 'delayed-token' })
        });
      });

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: 'Loading Job', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Loading Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-list"]')).toContainText('Loading Job');
      await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    });

    test('should not show authentication errors to users', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: 'Seamless Job', 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Seamless Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="job-list"]')).toContainText('Seamless Job');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      // Arrange
      await page.goto('/jobs');

      let requestCount = 0;
      await page.route('**/api/jobs', async route => {
        requestCount++;
        
        if (requestCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              job: { 
                id: 1, 
                title: `${browserName} Job`, 
                status: 'pending' 
              }
            })
          });
        }
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', `${browserName} Job`);
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="job-list"]')).toContainText(`${browserName} Job`);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle malformed server responses', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      await page.route('**/api/jobs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json{'
        });
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Malformed Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('error');
    });

    test('should handle network connectivity issues', async ({ page }) => {
      // Arrange
      await page.goto('/jobs');

      await page.route('**/api/jobs', async route => {
        await route.abort('failed');
      });

      // Act
      await page.click('[data-testid="create-job-button"]');
      await page.fill('[data-testid="job-title-input"]', 'Network Job');
      await page.click('[data-testid="save-job-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
    });
  });
});