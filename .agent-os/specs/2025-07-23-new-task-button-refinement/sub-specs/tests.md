# Tests Specification

> Spec: New Task Button Refinement
> Component: Testing Requirements
> Created: 2025-07-23

## E2E Test Requirements

### 1. Empty Task List Tests

**Test: New Task button position when list is empty**
```typescript
test('displays New Task button at top when task list is empty', async ({ page }) => {
  await page.goto('/jobs/123'); // Job with no tasks
  
  const taskList = page.locator('.task-list');
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  
  // Verify button exists and is first child
  await expect(newTaskButton).toBeVisible();
  await expect(taskList.locator('.task-item').first()).toHaveAttribute('data-testid', 'create-task-button');
  
  // Verify text is visible
  await expect(newTaskButton.locator('.add-task-placeholder')).toHaveText('New Task');
  await expect(newTaskButton.locator('.add-task-placeholder')).toBeVisible();
});
```

**Test: New Task button moves to bottom after adding first task**
```typescript
test('moves New Task button to bottom after creating first task', async ({ page }) => {
  await page.goto('/jobs/123'); // Job with no tasks
  
  // Create a task
  await page.click('[data-testid="create-task-button"]');
  await page.fill('[data-testid="task-title-input"]', 'First task');
  await page.press('[data-testid="task-title-input"]', 'Enter');
  
  await page.waitForTimeout(500); // Wait for reposition
  
  // Verify button is now last
  const taskList = page.locator('.task-list');
  await expect(taskList.locator('.task-item').last()).toHaveAttribute('data-testid', 'create-task-button');
});
```

### 2. Desktop Hover Interaction Tests

**Test: Desktop hover shows blue text and icon**
```typescript
test('desktop hover changes text and icon to blue', async ({ page }) => {
  await page.goto('/jobs/123'); // Job with existing tasks
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  const plusIcon = newTaskButton.locator('.status-emoji img');
  const taskText = newTaskButton.locator('.add-task-placeholder');
  
  // Initial state
  await expect(plusIcon).toHaveAttribute('src', '/icons/plus-circle.svg');
  await expect(taskText).toHaveCSS('color', 'rgb(142, 142, 147)'); // Default secondary color
  
  // Hover state
  await newTaskButton.hover();
  await expect(plusIcon).toHaveAttribute('src', '/icons/plus-circle-blue.svg');
  await expect(taskText).toHaveCSS('color', 'rgb(0, 122, 255)'); // Primary blue
});
```

**Test: Desktop hover hides label when tasks exist**
```typescript
test('desktop hover hides New Task label when tasks exist', async ({ page }) => {
  await page.goto('/jobs/123'); // Job with existing tasks
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  const taskText = newTaskButton.locator('.add-task-placeholder');
  
  // Label visible before hover
  await expect(taskText).toBeVisible();
  await expect(taskText).toHaveCSS('opacity', '1');
  
  // Hover hides label
  await newTaskButton.hover();
  await expect(taskText).toHaveCSS('opacity', '0');
});
```

**Test: Desktop hover keeps label visible for empty list**
```typescript
test('desktop hover keeps label visible when list is empty', async ({ page }) => {
  await page.goto('/jobs/empty'); // Job with no tasks
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  const taskText = newTaskButton.locator('.add-task-placeholder');
  
  // Hover should not hide label
  await newTaskButton.hover();
  await expect(taskText).toBeVisible();
  await expect(taskText).toHaveCSS('opacity', '1');
  await expect(taskText).toHaveCSS('color', 'rgb(0, 122, 255)'); // Still turns blue
});
```

### 3. Mobile Touch Interaction Tests

**Test: Mobile always shows label**
```typescript
test('mobile always displays New Task label', async ({ page, browserName }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/jobs/123'); // Job with existing tasks
  
  const taskText = page.locator('.add-task-placeholder');
  
  // Label should be visible
  await expect(taskText).toBeVisible();
  await expect(taskText).toHaveCSS('opacity', '1');
  
  // Simulate touch (tap)
  await page.tap('[data-testid="create-task-button"]');
  
  // Label should still be visible during interaction
  await expect(taskText).toBeVisible();
});
```

**Test: Mobile touch shows blue color**
```typescript
test('mobile touch interaction shows blue color', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/jobs/123');
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  
  // Trigger touch start and verify active state
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="create-task-button"]');
    const touchEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [{ 
        identifier: 0,
        target: button,
        clientX: 100,
        clientY: 100
      }]
    });
    button?.dispatchEvent(touchEvent);
  });
  
  // Verify active state styling
  const taskText = newTaskButton.locator('.add-task-placeholder');
  await expect(taskText).toHaveCSS('color', 'rgb(0, 122, 255)');
});
```

### 4. Icon Switching Tests

**Test: Icon switches without animation**
```typescript
test('icon switches immediately without transition', async ({ page }) => {
  await page.goto('/jobs/123');
  
  const plusIcon = page.locator('[data-testid="create-task-button"] .status-emoji img');
  
  // Verify no transition styles
  await expect(plusIcon).not.toHaveCSS('transition', /.*transform.*|.*opacity.*/);
  
  // Hover and verify immediate change
  await page.hover('[data-testid="create-task-button"]');
  await expect(plusIcon).toHaveAttribute('src', '/icons/plus-circle-blue.svg');
});
```

### 5. Accessibility Tests

**Test: Keyboard navigation support**
```typescript
test('maintains keyboard navigation support', async ({ page }) => {
  await page.goto('/jobs/123');
  
  // Tab to New Task button
  await page.keyboard.press('Tab');
  // Continue tabbing until we reach the button
  while (!(await page.evaluate(() => 
    document.activeElement?.getAttribute('data-testid') === 'create-task-button'
  ))) {
    await page.keyboard.press('Tab');
  }
  
  // Verify focus styles
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  await expect(newTaskButton).toBeFocused();
  
  // Enter should activate
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="task-title-input"]')).toBeVisible();
});
```

**Test: Screen reader announcements**
```typescript
test('provides appropriate ARIA labels', async ({ page }) => {
  await page.goto('/jobs/123');
  
  const newTaskButton = page.locator('[data-testid="create-task-button"]');
  
  // Check for appropriate ARIA attributes
  await expect(newTaskButton).toHaveAttribute('role', 'button');
  await expect(newTaskButton.locator('img')).toHaveAttribute('alt', 'Add task');
});
```

### 6. Responsive Behavior Tests

**Test: Responsive breakpoint behavior**
```typescript
test('responds correctly to viewport changes', async ({ page }) => {
  await page.goto('/jobs/123');
  
  // Desktop viewport
  await page.setViewportSize({ width: 1200, height: 800 });
  const taskText = page.locator('.add-task-placeholder');
  
  // Hover should hide text on desktop
  await page.hover('[data-testid="create-task-button"]');
  await expect(taskText).toHaveCSS('opacity', '0');
  
  // Switch to mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Text should be visible on mobile even with cursor over it
  await expect(taskText).toBeVisible();
  await expect(taskText).toHaveCSS('opacity', '1');
});
```

## Visual Regression Tests

1. **Empty list state** - Capture New Task button at top
2. **Populated list state** - Capture New Task button at bottom
3. **Desktop hover state** - Capture blue text and icon
4. **Mobile state** - Capture persistent label
5. **Dark theme** - Verify color variables work correctly

## Performance Tests

1. **Hover performance** - Ensure no lag on hover state changes
2. **Icon loading** - Verify both icon variants are preloaded
3. **Responsive switching** - No layout shift when changing viewports

## Browser Compatibility Tests

Test across:
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)
- iOS Safari
- Chrome Android

Focus on:
- Hover media query support
- Touch event handling
- CSS variable support
- Icon rendering