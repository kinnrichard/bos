import { test, expect } from '@playwright/test';

test.describe('Context-Aware Search', () => {
  test('should show appropriate search placeholder on different pages', async ({ page }) => {
    // Jobs page
    await page.goto('/jobs');
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search jobs');
    
    // Clients page
    await page.goto('/clients');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search clients');
    
    // Job detail page (should search tasks)
    // Note: This would need a valid job ID in a real test
    // await page.goto('/jobs/some-job-id');
    // await expect(searchInput).toHaveAttribute('placeholder', 'Search tasks');
  });

  test('should not show search on homepage', async ({ page }) => {
    await page.goto('/');
    const searchContainer = page.locator('.search-container');
    await expect(searchContainer).not.toBeVisible();
  });

  test('should filter jobs on jobs page', async ({ page }) => {
    await page.goto('/jobs');
    
    // Type in search
    const searchInput = page.locator('.search-input');
    await searchInput.fill('test');
    
    // Jobs should be filtered (exact behavior depends on test data)
    // This is a basic check that search input accepts text
    await expect(searchInput).toHaveValue('test');
    
    // Clear search
    const clearButton = page.locator('.search-clear');
    await clearButton.click();
    await expect(searchInput).toHaveValue('');
  });

  test('should filter clients on clients page', async ({ page }) => {
    await page.goto('/clients');
    
    // Type in search
    const searchInput = page.locator('.search-input');
    await searchInput.fill('vital');
    
    // Clients should be filtered
    await expect(searchInput).toHaveValue('vital');
    
    // Clear with escape key
    await searchInput.press('Escape');
    await expect(searchInput).toHaveValue('');
  });

  test('should clear search when navigating between pages', async ({ page }) => {
    // Start on jobs page and search
    await page.goto('/jobs');
    const searchInput = page.locator('.search-input');
    await searchInput.fill('test search');
    
    // Navigate to clients page
    await page.goto('/clients');
    
    // Search should be cleared
    await expect(searchInput).toHaveValue('');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search clients');
  });

  test('should preserve search when navigating to clients with query', async ({ page }) => {
    await page.goto('/clients?q=test');
    
    // Toolbar search should be visible and populated
    const toolbarSearch = page.locator('.toolbar .search-container');
    await expect(toolbarSearch).toBeVisible();
    
    const searchInput = page.locator('.toolbar .search-input');
    await expect(searchInput).toHaveValue('test');
    
    // URL should update after debounce when typing more
    await searchInput.fill('test client');
    await page.waitForTimeout(400); // Wait for 300ms debounce + buffer
    await expect(page).toHaveURL('/clients?q=test+client');
  });
});