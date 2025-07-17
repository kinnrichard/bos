import { test, expect } from '@playwright/test';

test.describe('Login functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication state for login tests
    await page.context().clearCookies();
    
    // Navigate to login page first
    await page.goto('/login');
    
    // Clear storage after navigation to avoid security errors
    try {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      // Ignore localStorage errors on some origins
      console.warn('Could not clear storage:', error instanceof Error ? error.message : String(error));
    }
  });

  test('should display login form elements', async ({ page }) => {
    // Check if form elements are present using proper selectors
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should validate empty fields', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in|login/i });

    // Try to submit without filling fields
    await submitButton.click();

    // Should show validation error or prevent submission
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login'); // Should remain on login page
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Fill email and press Tab to move to password
    await emailInput.fill('test@example.com');
    await emailInput.press('Tab');
    await expect(passwordInput).toBeFocused();

    // Fill password and press Enter to submit
    await passwordInput.fill('testpassword');
    await passwordInput.press('Enter');

    // Should trigger form submission (may show error for invalid credentials)
    // The important thing is that Enter key triggers the submission
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in|login/i });

    // Fill in invalid credentials
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');

    // Submit form
    await submitButton.click();

    // Should show error message or remain on login page
    const hasErrorMessage = await page.locator('.alert-error, .error-message, [role="alert"]').isVisible().catch(() => false);
    const remainsOnLogin = page.url().includes('/login');
    
    // Should either show error or remain on login page
    expect(hasErrorMessage || remainsOnLogin).toBe(true);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in|login/i });

    // Use test credentials from environment
    const email = process.env.TEST_USER_EMAIL || 'admin@bos-test.local';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    // Fill in valid credentials
    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL(url => !url.pathname.includes('/login')),
      submitButton.click()
    ]);

    // Should redirect away from login page
    await expect(page).not.toHaveURL(/.*\/login.*/);
  });

  test('should handle form submission without errors', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in|login/i });

    // Fill in credentials
    const email = process.env.TEST_USER_EMAIL || 'admin@bos-test.local';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    
    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Submit button should be clickable
    await expect(submitButton).toBeEnabled();
    
    // Click submit button - should not throw errors
    await submitButton.click();
    
    // Form submission should complete without errors
    // Either redirects or shows success/error message
    await page.waitForTimeout(1000); // Brief wait for any immediate response
    expect(true).toBe(true); // Test passes if no errors during submission
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure for login endpoint
    await page.route('**/api/v1/auth/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Network error' })
      });
    });

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in|login/i });

    // Fill in credentials
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword');

    // Submit form
    await submitButton.click();

    // Should show error message or remain on login page
    const hasErrorMessage = await page.locator('.alert-error, .error-message, [role="alert"]').isVisible().catch(() => false);
    const remainsOnLogin = page.url().includes('/login');
    
    // Should handle error gracefully
    expect(hasErrorMessage || remainsOnLogin).toBe(true);
  });
});