/**
 * Authentication Setup for Playwright Tests
 * 
 * This setup runs once before all tests and saves the authenticated state
 * to be reused across test runs, following Playwright best practices.
 */

import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('[AUTH SETUP] Starting authentication process...');
  
  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Use environment variables for credentials
  const email = process.env.TEST_USER_EMAIL || 'admin@bos-test.local';
  const password = process.env.TEST_USER_PASSWORD || 'password123';
  
  console.log(`[AUTH SETUP] Logging in as ${email}`);
  
  // Fill login form using proper selectors
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit form and wait for navigation
  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/login')),
    page.getByRole('button', { name: /sign in|login/i }).click()
  ]);
  
  // Verify successful authentication
  await expect(page).not.toHaveURL(/.*\/login.*/);
  
  // Look for common authenticated state indicators
  const authIndicators = [
    page.getByRole('button', { name: /logout|sign out/i }),
    page.getByText(/dashboard|welcome/i),
    page.locator('[data-testid="user-menu"]'),
    page.locator('.user-avatar')
  ];
  
  // Check if at least one authentication indicator is visible
  let authVerified = false;
  for (const indicator of authIndicators) {
    try {
      await expect(indicator).toBeVisible({ timeout: 2000 });
      authVerified = true;
      break;
    } catch {
      // Continue checking other indicators
    }
  }
  
  if (!authVerified) {
    console.warn('[AUTH SETUP] Warning: No clear authentication indicators found');
    // Still proceed - authentication might work differently
  }
  
  console.log(`[AUTH SETUP] Successfully authenticated, saving state to ${authFile}`);
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('[AUTH SETUP] Authentication setup complete');
});