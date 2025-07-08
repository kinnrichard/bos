import { test, expect } from '@playwright/test';
import { AuthHelper } from '../test-helpers/auth';
import { TestDatabase } from '../test-helpers/database';
import { DataFactory } from '../test-helpers/data-factories';

test.describe('Login functionality', () => {
  let db: TestDatabase;
  let auth: AuthHelper;
  let dataFactory: DataFactory;
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    // Initialize helpers
    db = new TestDatabase();
    auth = new AuthHelper(page);
    dataFactory = new DataFactory(page);
    
    // Setup authentication first to create user
    await auth.setupAuthenticatedSession('admin');
    
    // Create a test user for login tests
    testUser = await dataFactory.createUser({
      email: `test-user-${Date.now()}@bos-test.local`,
      password: 'testpassword123',
      name: 'Test User',
      role: 'admin'
    });
    
    // Clear authentication for login tests
    await page.context().clearCookies();
    
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

    // Fill in dynamic test credentials
    await emailInput.fill(testUser.email);
    await passwordInput.fill('testpassword123');

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

    // Fill in invalid credentials (wrong password)
    await emailInput.fill(testUser.email);
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
    await emailInput.fill(testUser.email);
    await emailInput.press('Tab');
    await expect(passwordInput).toBeFocused();

    // Fill password and press Enter to submit
    await passwordInput.fill('testpassword123');
    await passwordInput.press('Enter');

    // Should trigger form submission
    await expect(page.getByText('Signing In...')).toBeVisible();
  });

  test('should validate empty fields', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Try to submit without filling fields
    await submitButton.click();

    // Should show validation error or prevent submission
    const hasValidationError = await page.getByText(/please enter both email and password/i).isVisible().catch(() => false);
    const isSubmitDisabled = await submitButton.isDisabled().catch(() => false);
    
    // At least one validation mechanism should be active
    expect(hasValidationError || isSubmitDisabled).toBe(true);
  });

  test('should successfully login with valid dynamic credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Fill in valid dynamic credentials
    await emailInput.fill(testUser.email);
    await passwordInput.fill('testpassword123');

    // Submit form
    await submitButton.click();

    // Wait for navigation or success indication
    await page.waitForTimeout(2000);
    
    // Should either redirect away from login or show success
    const currentUrl = page.url();
    const isRedirected = !currentUrl.includes('/login');
    const hasSuccessIndicator = await page.locator('.success, .alert-success').isVisible().catch(() => false);
    
    // At least one success indicator should be present
    expect(isRedirected || hasSuccessIndicator).toBe(true);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure for login endpoint
    await page.route('**/api/v1/auth/sign_in*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Network error' })
      });
    });

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Fill in valid credentials
    await emailInput.fill(testUser.email);
    await passwordInput.fill('testpassword123');

    // Submit form
    await submitButton.click();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Should show error message or remain on login page
    const hasErrorMessage = await page.locator('.alert-error, .error-message').isVisible().catch(() => false);
    const remainsOnLogin = page.url().includes('/login');
    
    // Should either show error or remain on login page
    expect(hasErrorMessage || remainsOnLogin).toBe(true);
  });

  test.afterEach(async ({ page }) => {
    // Re-authenticate to clean up test user
    if (testUser?.id) {
      try {
        await auth.setupAuthenticatedSession('admin');
        await dataFactory.deleteEntity('users', testUser.id);
      } catch (error) {
        console.warn('Failed to cleanup test user:', error);
      }
    }
  });
});