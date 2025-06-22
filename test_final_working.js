const puppeteer = require('puppeteer');

(async () => {
  console.log('Testing Task Status Update and Reordering\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser:', msg.text());
  });
  
  try {
    // Navigate to job page
    console.log('1. Navigating to job page...');
    await page.goto('http://localhost:3000/clients/5/jobs/21');
    
    // Simple login if needed
    const needsLogin = await page.evaluate(() => {
      return !document.querySelector('.task-item');
    });
    
    if (needsLogin) {
      console.log('2. Logging in...');
      // Try to find login form
      const emailInput = await page.$('input[type="email"], input[name*="email"]');
      if (emailInput) {
        await emailInput.type('test@example.com');
        const passwordInput = await page.$('input[type="password"]');
        await passwordInput.type('testpassword');
        await passwordInput.press('Enter');
        await page.waitForNavigation();
        
        // Navigate back
        await page.goto('http://localhost:3000/clients/5/jobs/21');
      }
    }
    
    // Wait for tasks
    await page.waitForSelector('.task-item', { timeout: 10000 });
    console.log('3. Tasks loaded\n');
    
    // Get initial task order
    const initialOrder = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.task-item .task-title'))
        .map(el => ({
          title: el.textContent.trim(),
          status: el.closest('.task-item').dataset.taskStatus
        }));
    });
    
    console.log('Initial task order:');
    initialOrder.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.title} (${task.status})`);
    });
    
    // Find a task that's not in_progress
    const targetTaskIndex = initialOrder.findIndex(t => t.status !== 'in_progress');
    if (targetTaskIndex === -1) {
      console.log('\nAll tasks are already in progress!');
      return;
    }
    
    console.log(`\n4. Changing task #${targetTaskIndex + 1} "${initialOrder[targetTaskIndex].title}" to in_progress...`);
    
    // Click the status button
    const statusButton = await page.$$(`.task-item .task-status-button`);
    await statusButton[targetTaskIndex].click();
    
    // Wait for dropdown
    await page.waitForSelector('.task-status-dropdown:not(.hidden)');
    console.log('5. Dropdown opened');
    
    // Click in_progress
    await page.click('.task-status-dropdown:not(.hidden) button[data-status="in_progress"]');
    console.log('6. Clicked in_progress status\n');
    
    // Wait for potential reordering
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get final task order
    const finalOrder = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.task-item .task-title'))
        .map(el => ({
          title: el.textContent.trim(),
          status: el.closest('.task-item').dataset.taskStatus,
          emoji: el.closest('.task-item').querySelector('.task-status-button span').textContent
        }));
    });
    
    console.log('Final task order:');
    finalOrder.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.emoji} ${task.title} (${task.status})`);
    });
    
    // Check if reordering happened
    const taskMoved = initialOrder[targetTaskIndex].title !== finalOrder[targetTaskIndex].title;
    const targetTaskNewPosition = finalOrder.findIndex(t => t.title === initialOrder[targetTaskIndex].title);
    
    console.log('\n=== RESULTS ===');
    console.log(`✓ UI updated immediately: ${finalOrder[targetTaskNewPosition].status === 'in_progress' ? 'YES' : 'NO'}`);
    console.log(`✓ Task reordered: ${taskMoved ? 'YES' : 'NO'}`);
    if (taskMoved) {
      console.log(`  - Moved from position ${targetTaskIndex + 1} to position ${targetTaskNewPosition + 1}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'final_result.png' });
    console.log('\nScreenshot saved as final_result.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\nTest complete. Browser remains open for inspection.');
})();