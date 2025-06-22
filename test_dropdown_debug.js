// Test script to debug dropdown functionality with console logs
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  // Enable error logging
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  // Navigate to the job page
  await page.goto('http://localhost:3000/clients/24/jobs/31');
  
  // Wait for the page to load
  await page.waitForSelector('.task-wrapper');
  await page.waitForTimeout(1000);
  
  // Check Stimulus application and controllers
  const stimulusInfo = await page.evaluate(() => {
    const app = window.Stimulus;
    if (!app) return { hasStimulus: false };
    
    const contexts = app.router.contexts;
    const dropdownControllers = [];
    
    contexts.forEach(context => {
      if (context.identifier === 'dropdown') {
        dropdownControllers.push({
          identifier: context.identifier,
          element: context.element.className,
          hasButton: !!context.element.querySelector('[data-dropdown-target="button"]'),
          hasMenu: !!context.element.querySelector('[data-dropdown-target="menu"]'),
          menuHidden: context.element.querySelector('[data-dropdown-target="menu"]')?.classList.contains('hidden')
        });
      }
    });
    
    return {
      hasStimulus: true,
      controllerCount: contexts.size,
      dropdownControllers: dropdownControllers
    };
  });
  
  console.log('Stimulus info:', JSON.stringify(stimulusInfo, null, 2));
  
  // Test clicking the first task status button
  console.log('\n--- Testing first task dropdown ---');
  const firstButton = await page.$('.task-wrapper:first-child .task-status-button');
  if (firstButton) {
    await firstButton.click();
    await page.waitForTimeout(500);
    
    // Check dropdown state
    const dropdownState = await page.evaluate(() => {
      const firstWrapper = document.querySelector('.task-wrapper:first-child');
      const dropdown = firstWrapper.querySelector('.dropdown-container');
      const menu = dropdown?.querySelector('.dropdown-menu');
      
      return {
        hasDropdown: !!dropdown,
        hasMenu: !!menu,
        menuClasses: menu?.className,
        menuDisplay: menu ? window.getComputedStyle(menu).display : null,
        menuPosition: menu ? window.getComputedStyle(menu).position : null,
        dropdownOpen: dropdown?.dataset.dropdownOpen,
        menuBounds: menu ? menu.getBoundingClientRect() : null
      };
    });
    
    console.log('Dropdown state after click:', JSON.stringify(dropdownState, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'dropdown-debug.png', fullPage: true });
  }
  
  // Check for any JavaScript errors
  const jsErrors = await page.evaluate(() => {
    return window.__errors || [];
  });
  
  if (jsErrors.length > 0) {
    console.log('\nJavaScript errors found:', jsErrors);
  }
  
  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for manual inspection. Press Ctrl+C to exit.');
})();