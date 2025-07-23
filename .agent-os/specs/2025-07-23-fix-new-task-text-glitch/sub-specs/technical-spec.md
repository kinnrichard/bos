# Technical Specification

> Spec: Fix New Task Text Persistence Glitch
> Component: Technical Implementation
> Created: 2025-07-23

## Current Implementation Analysis

### The Issue

In `TaskList.svelte`, the `createTask` function follows this sequence:

```javascript
// Line 505: Create task via ActiveRecord (Zero.js handles persistence)
const newTask = await TaskModel.create({...});

// Lines 515-542: Add task to local array
tasks = [...tasks, newTask];

// Line 551: Clear the form
taskCreationManager.hide(type);
```

The problem: The UI re-renders after the task is added but before the input state is cleared, causing the text to briefly appear in the New Task row.

### Root Cause

The `taskCreationManager.hide()` call happens after the task array update, allowing Svelte's reactivity to trigger a re-render with the old input state still visible.

## Required Changes

### Solution: Clear Input State First

Move the state clearing to the beginning of the task creation process:

```javascript
async function createTask(type: 'bottom' | 'inline', shouldSelectAfterCreate: boolean = false) {
  const state = taskCreationManager.getState(type);
  if (!state.title.trim()) return;
  
  const title = state.title.trim();
  
  // Clear the input immediately to prevent visual glitch
  taskCreationManager.hide(type);
  
  // Continue with task creation...
  try {
    const newTask = await TaskModel.create({...});
    // Rest of the logic remains the same
  } catch (error) {
    // On error, restore the input state
    taskCreationManager.show(type);
    taskCreationManager.setTitle(type, title);
    // Handle error...
  }
}
```

## Implementation Details

1. **Immediate State Clear**: Call `taskCreationManager.hide()` at the start of `createTask`
2. **Error Recovery**: If task creation fails, restore the input with the original text
3. **No ActiveRecord Changes**: Zero.js data persistence remains untouched

## Why This Works

- Clears the visual state before any DOM updates occur
- Svelte's next re-render will show an empty input
- If creation fails, we restore the user's text for retry
- Maintains all existing Zero.js synchronization behavior

## Testing Considerations

The fix should be tested for:
1. Normal task creation (Enter key)
2. Task creation via blur
3. Error scenarios (network failure, validation errors)
4. Rapid task creation (multiple tasks quickly)