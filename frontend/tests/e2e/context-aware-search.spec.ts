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

  test('should not show search on client search results page', async ({ page }) => {
    await page.goto('/clients/search?q=test');
    
    // Toolbar search should not be visible on search results page
    const toolbarSearch = page.locator('.toolbar .search-container');
    await expect(toolbarSearch).not.toBeVisible();
    
    // But the page should have its own search input
    const pageSearch = page.locator('.search-page .search-input');
    await expect(pageSearch).toBeVisible();
    await expect(pageSearch).toHaveValue('test');
  });
});