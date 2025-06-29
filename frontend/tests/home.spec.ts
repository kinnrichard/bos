import { test, expect } from '@playwright/test';

test('home page has expected content', async ({ page }) => {
	await page.goto('/');
	
	// Check for the main heading
	await expect(page.getByRole('heading', { name: 'bŏs' })).toBeVisible();
	
	// Check for the subtitle
	await expect(page.getByText('Job Management System')).toBeVisible();
	
	// Check for the migration notice
	await expect(page.getByText('Svelte Migration in Progress')).toBeVisible();
});