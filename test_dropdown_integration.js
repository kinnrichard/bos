// Test script to check dropdown functionality
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to the job page
  await page.goto('http://localhost:3000/clients/24/jobs/31');
  
  // Wait for the page to load
  await page.waitForSelector('.task-wrapper');
  
  // Test parent task dropdown
  console.log('Testing parent task dropdown...');
  await page.click('.task-wrapper:first-child .task-status-button');
  await page.waitForTimeout(500);
  
  // Check if dropdown is visible
  const parentDropdownVisible = await page.evaluate(() => {
    const dropdown = document.querySelector('.task-wrapper:first-child .dropdown-menu');
    return dropdown && !dropdown.classList.contains('hidden');
  });
  
  console.log('Parent dropdown visible:', parentDropdownVisible);
  
  // Take screenshot
  await page.screenshot({ path: 'parent-dropdown-test.png' });
  
  // Close dropdown
  await page.click('body');
  await page.waitForTimeout(500);
  
  // Test child task dropdown
  console.log('Testing child task dropdown...');
  await page.click('.subtasks-container .task-status-button');
  await page.waitForTimeout(500);
  
  // Check if child dropdown is visible
  const childDropdownVisible = await page.evaluate(() => {
    const dropdown = document.querySelector('.subtasks-container .dropdown-menu');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      const rect = dropdown.getBoundingClientRect();
      console.log('Child dropdown position:', {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right
      });
      return true;
    }
    return false;
  });
  
  console.log('Child dropdown visible:', childDropdownVisible);
  
  // Take screenshot
  await page.screenshot({ path: 'child-dropdown-test.png', fullPage: true });
  
  // Check Stimulus controllers
  const controllersInfo = await page.evaluate(() => {
    const taskElements = document.querySelectorAll('[data-controller]');
    const info = [];
    taskElements.forEach(el => {
      info.push({
        controller: el.dataset.controller,
        classes: el.className,
        hasDropdownMenu: !!el.querySelector('.dropdown-menu')
      });
    });
    return info;
  });
  
  console.log('Stimulus controllers found:', controllersInfo);
  
  await browser.close();
})();