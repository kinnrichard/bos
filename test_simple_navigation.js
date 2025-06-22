// Simple test to check basic navigation
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    console.log('Current URL:', page.url());
    
    // Check if we're on the login page
    const loginForm = await page.$('form');
    console.log('Login form found:', !!loginForm);
    
    if (loginForm) {
      // Type email
      await page.type('input[type="email"]', 'office@benjaminstageco.com');
      
      // Type password
      await page.type('input[type="password"]', 'Test123!@#');
      
      // Submit form
      await page.keyboard.press('Enter');
      
      // Wait for any navigation
      await page.waitForTimeout(3000);
      console.log('After login URL:', page.url());
      
      // Check what's on the page
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      
      // Check for any redirect or error messages
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Page content preview:', bodyText.substring(0, 200));
      
      // Try to find clients link and navigate
      const clientsLink = await page.$('a[href*="clients"]');
      if (clientsLink) {
        console.log('Found clients link, clicking...');
        await clientsLink.click();
        await page.waitForTimeout(2000);
        console.log('After clients click URL:', page.url());
      }
      
      // Take screenshot
      await page.screenshot({ path: 'navigation-test.png' });
      console.log('Screenshot saved as navigation-test.png');
    }
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-navigation.png' });
  }
  
  console.log('\nTest completed. Browser will stay open.');
})();