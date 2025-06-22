const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/users/sign_in');
  
  // Wait for the page to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Take screenshot to see what's on the page
  await page.screenshot({ path: 'login_page.png' });
  console.log('Login page screenshot saved to login_page.png');
  
  // Try to find email input with various selectors
  const emailSelectors = [
    'input[name="user[email]"]',
    'input[type="email"]',
    '#user_email',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]'
  ];
  
  let emailInput = null;
  for (const selector of emailSelectors) {
    emailInput = await page.$(selector);
    if (emailInput) {
      console.log(`Found email input with selector: ${selector}`);
      break;
    }
  }
  
  if (!emailInput) {
    console.error('Could not find email input');
    // List all inputs on the page for debugging
    const inputs = await page.$$eval('input', els => els.map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder
    })));
    console.log('All inputs on page:', inputs);
    return;
  }
  
  // Find password input
  const passwordInput = await page.$('input[type="password"]');
  if (!passwordInput) {
    console.error('Could not find password input');
    return;
  }
  
  // Fill in credentials
  await emailInput.type('test@example.com');
  await passwordInput.type('testpassword');
  
  // Find and click submit
  const submitButton = await page.$('input[type="submit"]') || await page.$('button[type="submit"]');
  if (submitButton) {
    await submitButton.click();
    console.log('Submitted login form');
  } else {
    // Try pressing Enter
    await passwordInput.press('Enter');
    console.log('Pressed Enter to submit');
  }
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Login complete, navigating to job page...');
  
  // Navigate to job page
  await page.goto('http://localhost:3000/clients/5/jobs/21');
  
  // Wait for tasks to load
  await page.waitForSelector('.task-item', { timeout: 10000 });
  console.log('Page loaded, finding first task...');
  
  // Find the first task's status button
  const firstTaskStatus = await page.$('.task-item:first-child .task-status-button');
  if (!firstTaskStatus) {
    console.error('No task status button found');
    await browser.close();
    return;
  }
  
  // Get initial status
  const initialStatus = await page.$eval('.task-item:first-child', el => el.dataset.taskStatus);
  const initialEmoji = await page.$eval('.task-item:first-child .task-status-button span', el => el.textContent);
  console.log(`Initial status: ${initialStatus}, emoji: ${initialEmoji}`);
  
  // Click the status button to open dropdown
  await firstTaskStatus.click();
  console.log('Clicked status button, waiting for dropdown...');
  
  // Wait for dropdown to appear
  await page.waitForSelector('.task-item:first-child .task-status-dropdown:not(.hidden)', { timeout: 5000 });
  console.log('Dropdown opened');
  
  // Take a screenshot of the dropdown
  await page.screenshot({ path: 'status_dropdown.png' });
  
  // Change status to "in_progress"
  const inProgressButton = await page.$('.task-item:first-child .task-status-dropdown button[data-status="in_progress"]');
  if (!inProgressButton) {
    console.error('In progress button not found');
    await browser.close();
    return;
  }
  
  // Click to change status
  await inProgressButton.click();
  console.log('Clicked in_progress status');
  
  // Wait a moment for the update
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if emoji updated immediately
  const updatedEmoji = await page.$eval('.task-item:first-child .task-status-button span', el => el.textContent);
  const updatedStatus = await page.$eval('.task-item:first-child', el => el.dataset.taskStatus);
  console.log(`After click - status: ${updatedStatus}, emoji: ${updatedEmoji}`);
  
  // Check if dropdown is hidden
  const dropdownHidden = await page.$eval('.task-item:first-child .task-status-dropdown', el => el.classList.contains('hidden'));
  console.log(`Dropdown hidden: ${dropdownHidden}`);
  
  // Wait a bit longer to see if any reordering happens
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check final position of tasks
  const taskTitles = await page.$$eval('.task-item .task-title', els => els.map(el => el.textContent.trim()));
  console.log('\nFinal task order:');
  taskTitles.forEach((title, idx) => console.log(`  ${idx + 1}. ${title}`));
  
  // Take final screenshot
  await page.screenshot({ path: 'after_status_change.png' });
  
  // Check console for any errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
  
  console.log('\nTest complete. Check screenshots for visual confirmation.');
  console.log('Browser will remain open for manual inspection.');
  
  // Keep browser open for manual inspection
  // await browser.close();
})();