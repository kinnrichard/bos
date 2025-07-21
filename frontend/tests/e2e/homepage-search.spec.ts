import { test, expect } from '@playwright/test';

test.describe('Homepage Search Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
  });

  test('should display homepage with centered search input', async ({ page }) => {
    // Check that we're on the homepage (not redirected to /jobs)
    await expect(page).toHaveURL('/');
    
    // Check for the search input
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search');
    
    // Check for the search button
    const searchButton = page.locator('button:has-text("Search")');
    await expect(searchButton).toBeVisible();
    
    // Check that search button is disabled when input is empty
    await expect(searchButton).toBeDisabled();
    
    // Check for quick navigation links
    await expect(page.locator('a:has-text("Clients")')).toBeVisible();
    await expect(page.locator('a:has-text("Jobs")')).toBeVisible();
  });

  test('should enable search button when text is entered', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    const searchButton = page.locator('button:has-text("Search")');
    
    // Type in search input
    await searchInput.fill('test client');
    
    // Search button should now be enabled
    await expect(searchButton).toBeEnabled();
  });

  test('should navigate to search results page on search', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    const searchButton = page.locator('button:has-text("Search")');
    
    // Type and search
    await searchInput.fill('test search');
    await searchButton.click();
    
    // Should navigate to search results page
    await expect(page).toHaveURL('/clients/search?q=test+search');
    
    // Search input should still be visible with the query
    const resultsSearchInput = page.locator('input[type="search"]');
    await expect(resultsSearchInput).toHaveValue('test search');
  });

  test('should show search results and New Client option', async ({ page }) => {
    // Navigate directly to search results
    await page.goto('/clients/search?q=test');
    
    // Wait for the search page to load
    await page.waitForSelector('.search-results');
    
    // Check for "New Client" option at the bottom
    const newClientButton = page.locator('button:has-text("New Client")');
    await expect(newClientButton).toBeVisible();
    await expect(newClientButton).toHaveClass(/new-client-item/);
  });

  test('should navigate back to homepage when clicking logo', async ({ page }) => {
    // Start on a different page
    await page.goto('/jobs');
    
    // Click the logo
    const logo = page.locator('.logo-link');
    await logo.click();
    
    // Should be back on homepage
    await expect(page).toHaveURL('/');
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('sidebar should show "Clients" instead of "People" on homepage', async ({ page }) => {
    // On homepage
    await expect(page).toHaveURL('/');
    
    // Check sidebar shows "Clients"
    const sidebar = page.locator('.sidebar');
    await expect(sidebar.locator('a:has-text("Clients")')).toBeVisible();
    
    // Navigate to jobs page
    await page.goto('/jobs');
    
    // Check sidebar shows "People" on other pages
    await expect(sidebar.locator('a:has-text("People")')).toBeVisible();
  });
});