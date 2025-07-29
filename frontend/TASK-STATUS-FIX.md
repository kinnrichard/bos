# Task Status Click Behavior Fix

## Summary
Fixed the task status click behavior logic in TaskRow.svelte to provide more predictable and direct interaction patterns.

## Changes Made

### 1. Removed Complex Debouncing System
- Eliminated `clickCount` state variable
- Eliminated `clickTimer` state variable  
- Removed the 1000ms timeout logic that was causing confusion

### 2. Simplified Click Logic
**Before**: Complex debouncing with 1000ms delay and click counting
**After**: Direct, immediate response based on task status

### 3. New Behavior Rules
- **new_task** → Single click advances to `in_progress` (auto-cycle)
- **in_progress** → Single click advances to `successfully_completed` (auto-cycle)
- **paused** → Single click immediately shows popover (status menu)
- **successfully_completed** → Single click immediately shows popover (status menu)
- **cancelled** → Single click immediately shows popover (status menu)

### 4. Updated Tooltips
- Auto-advancing statuses: "Click to advance to next status"
- Menu-opening statuses: "Click for status options"

## Code Changes

### TaskRow.svelte
```typescript
// BEFORE: Complex debouncing
let clickCount = $state(0);
let clickTimer: number | null = $state(null);
// Complex timeout logic...

// AFTER: Simple state management
let showStatusPopover = $state(false);

// BEFORE: Complex click handler with debouncing
function handleStatusClick(event: MouseEvent) {
  // Complex timing logic...
  clickCount++;
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    // Complex decision tree based on click count and timing
  }, 1000);
}

// AFTER: Direct, predictable logic
function handleStatusClick(event: MouseEvent) {
  if (!taskCanChangeStatus) return;
  event.stopPropagation();
  
  // Auto-advance for 'new_task' and 'in_progress' only
  if (task.status === 'new_task' || task.status === 'in_progress') {
    handleQuickStatusCycle();
  } else {
    // For all other statuses, show popover immediately
    showStatusPopover = true;
  }
}
```

## Benefits
1. **Predictability**: Users know exactly what will happen when they click
2. **Responsiveness**: No more waiting 1000ms for actions to complete
3. **Clarity**: Clear distinction between auto-advancing and menu-opening statuses
4. **Simplicity**: Much simpler code that's easier to maintain and debug

## Testing
Created comprehensive Playwright test suite in `tests/components/task-status-click.spec.ts` to verify:
- Auto-cycling behavior for new_task and in_progress
- Immediate popover display for paused, completed, and cancelled
- Proper tooltip text updates
- No unwanted popover displays during auto-cycling

## User Experience Impact
- **Reduced friction** for common task progression (new → in progress → completed)
- **Immediate access** to full status menu for terminal/special states
- **Eliminated confusion** from timing-based interactions
- **More intuitive** behavior that matches user expectations