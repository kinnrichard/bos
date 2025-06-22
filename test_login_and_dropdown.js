// Test script to login and then test dropdowns
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/');
    
    // Check if we're on the login page
    const isLoginPage = await page.evaluate(() => {
      return document.querySelector('input[type="email"]') || document.querySelector('input[type="password"]');
    });
    
    if (isLoginPage) {
      console.log('On login page, logging in...');
      // Type email
      await page.type('input[type="email"]', 'office@benjaminstageco.com');
      
      // Type password
      await page.type('input[type="password"]', 'Test123!@#');
      
      // Submit form
      await page.keyboard.press('Enter');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      console.log('Logged in successfully');
    }
    
    // Navigate to specific job
    console.log('Navigating to job page...');
    await page.goto('http://localhost:3000/clients/24/jobs/31');
    
    // Wait for page to load
    await page.waitForSelector('.job-view', { timeout: 10000 });
    console.log('Job page loaded');
    
    // Wait a bit for Stimulus to initialize
    await page.waitForTimeout(2000);
    
    // Check for task wrappers
    const taskCount = await page.evaluate(() => {
      return document.querySelectorAll('.task-wrapper').length;
    });
    console.log(`Found ${taskCount} task wrappers`);
    
    // Check Stimulus controllers
    const stimulusInfo = await page.evaluate(() => {
      const app = window.Stimulus;
      if (!app) return { hasStimulus: false };
      
      const dropdownControllers = [];
      const allControllers = [];
      
      // Get all controller contexts
      app.router.contexts.forEach(context => {
        allControllers.push(context.identifier);
        if (context.identifier === 'dropdown') {
          const element = context.element;
          dropdownControllers.push({
            classes: element.className,
            hasButton: !!element.querySelector('[data-dropdown-target="button"]'),
            hasMenu: !!element.querySelector('[data-dropdown-target="menu"]'),
            menuHidden: element.querySelector('[data-dropdown-target="menu"]')?.classList.contains('hidden'),
            positioning: element.dataset.dropdownPositioningValue
          });
        }
      });
      
      return {
        hasStimulus: true,
        allControllers: [...new Set(allControllers)],
        dropdownCount: dropdownControllers.length,
        dropdownControllers: dropdownControllers
      };
    });
    
    console.log('\nStimulus info:', JSON.stringify(stimulusInfo, null, 2));
    
    if (stimulusInfo.dropdownCount > 0) {
      console.log('\n--- Testing first dropdown ---');
      
      // Click the first task status button
      const clicked = await page.evaluate(() => {
        const button = document.querySelector('.task-wrapper:first-child .task-status-button');
        if (button) {
          button.click();
          return true;
        }
        return false;
      });
      
      if (clicked) {
        console.log('Clicked first task status button');
        await page.waitForTimeout(1000);
        
        // Check dropdown state
        const dropdownState = await page.evaluate(() => {
          const menu = document.querySelector('.task-wrapper:first-child .dropdown-menu');
          return {
            menuExists: !!menu,
            menuHidden: menu?.classList.contains('hidden'),
            menuDisplay: menu ? window.getComputedStyle(menu).display : null,
            menuVisibility: menu ? window.getComputedStyle(menu).visibility : null,
            menuPosition: menu ? window.getComputedStyle(menu).position : null,
            menuZIndex: menu ? window.getComputedStyle(menu).zIndex : null,
            menuBounds: menu ? menu.getBoundingClientRect() : null
          };
        });
        
        console.log('Dropdown state:', JSON.stringify(dropdownState, null, 2));
        
        // Take screenshot
        await page.screenshot({ path: 'dropdown-test-result.png', fullPage: true });
        console.log('Screenshot saved as dropdown-test-result.png');
      }
    }
    
    console.log('\nTest completed. Browser will stay open for inspection.');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  }
})();