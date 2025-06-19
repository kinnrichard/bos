const puppeteer = require('puppeteer');

(async () => {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true if you don't want to see the browser
    defaultViewport: null // Use the default viewport size
  });

  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Navigate to apple.com
    await page.goto('https://www.apple.com', {
      waitUntil: 'networkidle2' // Wait until network is idle
    });
    
    console.log('Successfully navigated to apple.com');
    console.log('Page title:', await page.title());
    
    // Keep the browser open for 10 seconds to view the page
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Error navigating to apple.com:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
})();