import { test, expect } from '@playwright/test';

test('Debug UI - What is on the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what's on the page
  await page.screenshot({ path: 'test-results/home-page.png', fullPage: true });
  
  // List all main elements
  console.log('Looking for main UI elements...');
  
  // Check for jobs
  const jobCards = await page.locator('.job-card').count();
  console.log(`Found ${jobCards} job cards`);
  
  const jobItems = await page.locator('.job-item').count();
  console.log(`Found ${jobItems} job items`);
  
  const jobsList = await page.locator('[data-testid*="job"]').count();
  console.log(`Found ${jobsList} elements with job testid`);
  
  // Check for tasks
  const taskItems = await page.locator('.task-item').count();
  console.log(`Found ${taskItems} task items`);
  
  const taskList = await page.locator('.task-list').count();
  console.log(`Found ${taskList} task lists`);
  
  // Check for any main containers
  const mainContent = await page.locator('main, [role="main"], .main-content').count();
  console.log(`Found ${mainContent} main content areas`);
  
  // Check what's actually visible
  const visibleText = await page.locator('body').innerText();
  console.log('Page text preview:', visibleText.substring(0, 500));
  
  // Always pass so we can see the output
  expect(true).toBe(true);
});