const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting task status update test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('Browser console:', msg.text());
    }
  });
  
  // Monitor network requests
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/tasks/')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/tasks/')) {
      console.log(`\nResponse from ${response.url()}`);
      console.log(`Status: ${response.status()}`);
      console.log(`Content-Type: ${response.headers()['content-type']}`);
    }
  });
  
  try {
    // Navigate to the job page
    console.log('Navigating to job page...');
    await page.goto('http://localhost:3000/clients/5/jobs/21');
    
    // Check if we need to login
    const needsLogin = await page.$('input[type="email"]') !== null;
    
    if (needsLogin) {
      console.log('Logging in...');
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'testpassword');
      await page.keyboard.press('Enter');
      await page.waitForNavigation();
      
      // Navigate back to job page
      await page.goto('http://localhost:3000/clients/5/jobs/21');
    }
    
    // Wait for tasks to load
    await page.waitForSelector('.task-item', { timeout: 10000 });
    console.log('Tasks loaded successfully\n');
    
    // Check if Turbo is available
    const turboAvailable = await page.evaluate(() => {
      return typeof window.Turbo !== 'undefined';
    });
    console.log(`Turbo available: ${turboAvailable}\n`);
    
    // Get initial task info
    const initialTaskInfo = await page.evaluate(() => {
      const firstTask = document.querySelector('.task-item:first-child');
      return {
        status: firstTask.dataset.taskStatus,
        emoji: firstTask.querySelector('.task-status-button span').textContent,
        title: firstTask.querySelector('.task-title').textContent.trim()
      };
    });
    
    console.log('Initial task state:');
    console.log(`  Title: ${initialTaskInfo.title}`);
    console.log(`  Status: ${initialTaskInfo.status}`);
    console.log(`  Emoji: ${initialTaskInfo.emoji}\n`);
    
    // Click status button
    console.log('Opening status dropdown...');
    await page.click('.task-item:first-child .task-status-button');
    
    // Wait for dropdown
    await page.waitForSelector('.task-item:first-child .task-status-dropdown:not(.hidden)');
    console.log('Dropdown opened\n');
    
    // Take screenshot
    await page.screenshot({ path: 'status_dropdown_open.png' });
    
    // Click "in_progress" status
    console.log('Changing status to "in_progress"...');
    await page.click('.task-item:first-child button[data-status="in_progress"]');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check immediate UI update
    const updatedTaskInfo = await page.evaluate(() => {
      const firstTask = document.querySelector('.task-item:first-child');
      const dropdown = firstTask.querySelector('.task-status-dropdown');
      return {
        status: firstTask.dataset.taskStatus,
        emoji: firstTask.querySelector('.task-status-button span').textContent,
        dropdownHidden: dropdown.classList.contains('hidden')
      };
    });
    
    console.log('After clicking status:');
    console.log(`  Status attribute: ${updatedTaskInfo.status}`);
    console.log(`  Emoji: ${updatedTaskInfo.emoji}`);
    console.log(`  Dropdown hidden: ${updatedTaskInfo.dropdownHidden}\n`);
    
    // Check if UI updated immediately
    const uiUpdatedImmediately = updatedTaskInfo.emoji === '🟢' && updatedTaskInfo.status === 'in_progress';
    console.log(`✓ UI updated immediately: ${uiUpdatedImmediately ? 'YES' : 'NO'}\n`);
    
    // Wait for server response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if any requests were made
    console.log(`Server requests made: ${requests.length}`);
    if (requests.length > 0) {
      const request = requests[0];
      console.log(`  Method: ${request.method}`);
      console.log(`  Accept header: ${request.headers.accept}`);
    }
    
    // Get final task order
    const finalTaskOrder = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.task-item .task-title'))
        .map(el => el.textContent.trim());
    });
    
    console.log('\nFinal task order:');
    finalTaskOrder.forEach((title, i) => {
      console.log(`  ${i + 1}. ${title}`);
    });
    
    // Take final screenshot
    await page.screenshot({ path: 'after_status_update.png' });
    
    console.log('\n✓ Test completed successfully!');
    console.log('Check screenshots: status_dropdown_open.png and after_status_update.png');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  // Keep browser open for inspection
  console.log('\nBrowser will remain open for manual inspection...');
})();