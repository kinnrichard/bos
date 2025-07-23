# Tests Specification

> Spec: Fix New Task Text Persistence Glitch
> Component: Testing Requirements
> Created: 2025-07-23

## Test Requirements

### 1. Visual Regression Test

**Test: No text ghosting in New Task input**
```javascript
test('should clear input immediately without visual artifacts', async ({ page }) => {
  await page.goto('/jobs/test');
  
  // Type task text
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  await newTaskButton.click();
  
  const input = page.locator('[data-testid="task-title-input"]');
  await input.fill('Test task that should not ghost');
  
  // Capture state immediately after Enter
  const enterPromise = input.press('Enter');
  
  // Check input is cleared immediately
  await expect(input).toHaveValue('', { timeout: 100 });
  
  await enterPromise;
  
  // Verify task was created
  await expect(page.locator('.task-title').filter({ hasText: 'Test task that should not ghost' })).toBeVisible();
  
  // Verify New Task row shows no text
  await expect(page.locator('[data-testid="create-task-button"] .add-task-placeholder')).toHaveText('New Task');
});
```

### 2. Error Recovery Test

**Test: Input text restored on creation failure**
```javascript
test('should restore input text if task creation fails', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/v1/tasks', route => {
    route.abort('failed');
  });
  
  await page.goto('/jobs/test');
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  await newTaskButton.click();
  
  const input = page.locator('[data-testid="task-title-input"]');
  const testText = 'This task will fail to create';
  await input.fill(testText);
  await input.press('Enter');
  
  // Input should be restored with original text
  await expect(input).toHaveValue(testText);
  await expect(input).toBeVisible();
});
```

### 3. Rapid Creation Test

**Test: Multiple quick task creations without glitches**
```javascript
test('should handle rapid task creation without text ghosting', async ({ page }) => {
  await page.goto('/jobs/test');
  
  for (let i = 1; i <= 5; i++) {
    const newTaskButton = page.locator('[data-testid="create-task-button"]');
    await newTaskButton.click();
    
    const input = page.locator('[data-testid="task-title-input"]');
    await input.fill(`Quick task ${i}`);
    
    const enterPromise = input.press('Enter');
    
    // Each input should clear immediately
    await expect(input).toHaveValue('', { timeout: 100 });
    
    await enterPromise;
    await page.waitForTimeout(50); // Small delay between creations
  }
  
  // All tasks should be created
  for (let i = 1; i <= 5; i++) {
    await expect(page.locator('.task-title').filter({ hasText: `Quick task ${i}` })).toBeVisible();
  }
});
```

### 4. Focus Management Test

**Test: Focus behavior during task creation**
```javascript
test('should manage focus correctly during creation', async ({ page }) => {
  await page.goto('/jobs/test');
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  await newTaskButton.click();
  
  const input = page.locator('[data-testid="task-title-input"]');
  await expect(input).toBeFocused();
  
  await input.fill('Test focus management');
  await input.press('Enter');
  
  // After creation, focus should not be on the input
  await expect(input).not.toBeVisible();
  
  // New Task button should be visible but not focused
  await expect(newTaskButton).toBeVisible();
  await expect(newTaskButton).not.toBeFocused();
});
```

## Manual Testing Checklist

1. **Standard Creation**
   - [ ] Type task text and press Enter
   - [ ] Verify no text appears in New Task row after creation
   - [ ] Verify smooth transition

2. **Edge Cases**
   - [ ] Create task with very long text
   - [ ] Create task with special characters
   - [ ] Create task and immediately try to create another

3. **Error Scenarios**
   - [ ] Disconnect network and try to create task
   - [ ] Verify input text is restored on failure

4. **Performance**
   - [ ] Create 10+ tasks rapidly
   - [ ] No visual glitches should appear