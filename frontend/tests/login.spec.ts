import { test, expect } from '@playwright/test';
import { AuthHelper } from '../test-helpers/auth';

test.describe('Login functionality', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    // Initialize auth helper
    auth = new AuthHelper(page);
    
    // Clear any existing authentication
    await auth.clearAuth();
    
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check if form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should prevent double submission', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Fill in real test credentials
    await emailInput.fill('admin@bos-test.local');
    await passwordInput.fill('password123');

    // Click submit button (should prevent double submission due to loading guard)
    await submitButton.click();

    // Wait a moment for any potential second click to be prevented
    await page.waitForTimeout(100);
    
    // Try to click again - should be prevented by loading state
    await submitButton.click();

    // Check that form is in submission state (either loading text or disabled button)
    const hasLoadingText = await page.getByText('Signing In...').isVisible().catch(() => false);
    const isButtonDisabled = await submitButton.isDisabled().catch(() => false);
    
    // At least one of these should be true
    expect(hasLoadingText || isButtonDisabled).toBe(true);
  });

  test('should show proper error message for invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Fill in invalid credentials
    await emailInput.fill('admin@bos-test.local');
    await passwordInput.fill('wrongpassword');

    // Submit form
    await submitButton.click();

    // Wait for response and check error message
    // Should show specific rate limiting message if we hit 429
    const errorMessage = page.locator('.alert-error');
    await expect(errorMessage).toBeVisible();
    
    // Check for specific rate limiting text
    const errorText = await errorMessage.textContent();
    if (errorText?.includes('Rate limit') || errorText?.includes('Too many')) {
      expect(errorText).toMatch(/too many.*try again/i);
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Fill email and press Tab to move to password
    await emailInput.fill('test@example.com');
    await emailInput.press('Tab');
    await expect(passwordInput).toBeFocused();

    // Fill password and press Enter to submit
    await passwordInput.fill('password123');
    await passwordInput.press('Enter');

    // Should trigger form submission
    await expect(page.getByText('Signing In...')).toBeVisible();
  });

  test('should validate empty fields', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Try to submit without filling fields
    await submitButton.click();

    // Should show validation error
    await expect(page.getByText(/please enter both email and password/i)).toBeVisible();
  });
});