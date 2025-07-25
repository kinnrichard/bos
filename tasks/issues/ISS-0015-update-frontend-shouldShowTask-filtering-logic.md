---
actual_hours: 0
assignees: []
created_at: '2025-07-25T15:03:00.000000'
dependencies:
- ISS-0014
description: Modify frontend task filtering to use has_discarded_ancestor property to hide descendants of deleted tasks from normal views
due_date: null
estimated_hours: 4
id: ISS-0015
labels:
- frontend
- filtering
- logic
- task-store
metadata:
  goal: Update frontend shouldShowTask filtering logic to use has_discarded_ancestor property
  owner: null
  progress: 0
  subtasks: []
  type: issue
parent: EP-0006
priority: high
status: blocked
tags:
- issue
- frontend
title: Update frontend shouldShowTask filtering logic
updated_at: '2025-07-25T15:03:00.000000'
---

# Update Frontend shouldShowTask Filtering Logic

## Overview
Update the frontend task filtering logic to utilize the new `has_discarded_ancestor` property from the API. This will hide descendants of deleted tasks from normal task lists while keeping them accessible in the deleted task view.

## Current State Analysis

### Existing Filtering Logic
Based on the codebase structure, the filtering logic likely exists in:
- `frontend/src/lib/stores/task-store.svelte.ts`
- Task list components in `frontend/src/lib/components/tasks/`

### Current Implementation Pattern
```typescript
// Current filtering (example)
const shouldShowTask = (task: Task, showDeleted: boolean = false): boolean => {
  if (showDeleted) {
    return task.discarded_at !== null;
  }
  return task.discarded_at === null;
};
```

## Requirements

### Updated Filtering Logic
Implement new filtering logic that considers ancestor deletion state:

```typescript
const shouldShowTask = (task: Task, showDeleted: boolean = false): boolean => {
  // When showing deleted tasks, show if task itself is deleted
  if (showDeleted) {
    return task.discarded_at !== null;
  }
  
  // For normal views, hide if task or any ancestor is deleted
  return task.discarded_at === null && !task.has_discarded_ancestor;
};
```

### Task Type Definition
Ensure the Task interface includes the new properties:

```typescript
interface Task {
  id: string;
  name: string;
  status: string;
  discarded_at: string | null;
  has_discarded_ancestor: boolean;
  parent_id: string | null;
  // ... other properties
}
```

## Implementation Details

### File Locations to Update

#### 1. Task Store (`frontend/src/lib/stores/task-store.svelte.ts`)
Update the main filtering logic in the task store:

```typescript
// In task-store.svelte.ts
class TaskStore {
  // Existing code...
  
  shouldShowTask(task: Task, showDeleted: boolean = false): boolean {
    // When showing deleted tasks, show only tasks that are themselves deleted
    if (showDeleted) {
      return task.discarded_at !== null;
    }
    
    // For normal views, hide if task is deleted OR has a deleted ancestor
    return task.discarded_at === null && !task.has_discarded_ancestor;
  }
  
  // Update derived stores that use filtering
  get visibleTasks() {
    return this.allTasks.filter(task => this.shouldShowTask(task, this.showDeleted));
  }
}
```

#### 2. Task List Components
Update components that implement task filtering:

```typescript
// In task list components
const filteredTasks = $derived(
  tasks.filter(task => shouldShowTask(task, showDeletedTasks))
);
```

#### 3. Deleted Task View
Ensure deleted task view shows descendants of deleted parents:

```typescript
// For deleted task view specifically
const deletedTasks = $derived(
  tasks.filter(task => shouldShowTask(task, true))
);
```

### Reactive Updates
Ensure that when a task's deletion status changes, all dependent views update:

```typescript
// When task deletion status changes
$effect(() => {
  // Trigger recalculation of visible tasks
  if (taskDeletionStateChanged) {
    // Store will automatically recalculate filtered lists
    taskStore.refresh();
  }
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Normal task lists hide tasks with `has_discarded_ancestor: true`
- [ ] Normal task lists hide tasks with `discarded_at !== null`
- [ ] Deleted task view shows tasks with `discarded_at !== null` regardless of ancestor state
- [ ] Task visibility updates immediately when parent deletion status changes
- [ ] Task restoration properly shows descendants when parent is restored

### User Experience Requirements
- [ ] No visible delay when tasks are hidden/shown after deletion state changes
- [ ] Task hierarchy remains visually consistent
- [ ] No tasks appear/disappear unexpectedly during normal operation
- [ ] Smooth transitions when switching between normal and deleted views

### Technical Requirements
- [ ] No performance regression in task list rendering
- [ ] TypeScript types properly reflect new task properties
- [ ] All existing task operations continue to work
- [ ] Error handling for missing properties (backward compatibility)

## Testing Requirements

### Unit Tests

#### Task Store Tests
```typescript
// test/stores/task-store.test.ts
import { describe, it, expect } from 'vitest';
import { TaskStore } from '$lib/stores/task-store.svelte.ts';

describe('TaskStore shouldShowTask', () => {
  it('shows non-deleted tasks without deleted ancestors', () => {
    const task = { 
      id: '1', 
      discarded_at: null, 
      has_discarded_ancestor: false 
    };
    
    expect(taskStore.shouldShowTask(task, false)).toBe(true);
  });
  
  it('hides tasks with deleted ancestors in normal view', () => {
    const task = { 
      id: '1', 
      discarded_at: null, 
      has_discarded_ancestor: true 
    };
    
    expect(taskStore.shouldShowTask(task, false)).toBe(false);
  });
  
  it('shows deleted tasks in deleted view', () => {
    const task = { 
      id: '1', 
      discarded_at: '2023-01-01T00:00:00Z', 
      has_discarded_ancestor: false 
    };
    
    expect(taskStore.shouldShowTask(task, true)).toBe(true);
  });
  
  it('does not show non-deleted descendants in deleted view', () => {
    const task = { 
      id: '1', 
      discarded_at: null, 
      has_discarded_ancestor: true 
    };
    
    expect(taskStore.shouldShowTask(task, true)).toBe(false);
  });
});
```

#### Integration Tests
```typescript
// test/components/task-list.test.ts
describe('Task List Filtering', () => {
  it('hides descendants when parent is deleted', async () => {
    const parent = createTask({ id: '1', name: 'Parent' });
    const child = createTask({ 
      id: '2', 
      name: 'Child', 
      parent_id: '1',
      has_discarded_ancestor: false 
    });
    
    render(TaskList, { tasks: [parent, child] });
    
    // Both tasks should be visible initially
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    
    // Delete parent
    await deleteTask(parent.id);
    
    // Child should now be hidden (has_discarded_ancestor: true)
    expect(screen.queryByText('Child')).not.toBeInTheDocument();
  });
  
  it('shows descendants in deleted view when parent is deleted', async () => {
    const child = createTask({ 
      id: '2', 
      name: 'Child', 
      discarded_at: null,
      has_discarded_ancestor: true 
    });
    
    render(TaskList, { tasks: [child], showDeleted: true });
    
    // Child should not be visible in deleted view (not itself deleted)
    expect(screen.queryByText('Child')).not.toBeInTheDocument();
    
    // But deleted parent should be visible
    const deletedParent = createTask({
      id: '1',
      name: 'Deleted Parent',
      discarded_at: '2023-01-01T00:00:00Z'
    });
    
    rerender({ tasks: [deletedParent, child], showDeleted: true });
    expect(screen.getByText('Deleted Parent')).toBeInTheDocument();
  });
});
```

### End-to-End Tests
```typescript
// tests/e2e/task-hierarchy-deletion.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Hierarchy Deletion', () => {
  test('descendants disappear when parent is deleted', async ({ page }) => {
    // Setup: Create parent with children
    await page.goto('/tasks');
    await createTaskHierarchy(page, [
      { name: 'Parent Task', id: 'parent' },
      { name: 'Child Task', parent: 'parent', id: 'child' },
      { name: 'Grandchild Task', parent: 'child', id: 'grandchild' }
    ]);
    
    // Verify all tasks are visible
    await expect(page.getByText('Parent Task')).toBeVisible();
    await expect(page.getByText('Child Task')).toBeVisible();
    await expect(page.getByText('Grandchild Task')).toBeVisible();
    
    // Delete parent task
    await deleteTask(page, 'parent');
    
    // Verify descendants are hidden
    await expect(page.getByText('Child Task')).not.toBeVisible();
    await expect(page.getByText('Grandchild Task')).not.toBeVisible();
  });
  
  test('descendants reappear when parent is restored', async ({ page }) => {
    // Setup with deleted parent
    await setupDeletedTaskHierarchy(page);
    
    // Go to deleted tasks view
    await page.click('[data-testid="show-deleted-toggle"]');
    
    // Restore parent
    await restoreTask(page, 'parent');
    
    // Return to normal view
    await page.click('[data-testid="show-deleted-toggle"]');
    
    // Verify descendants are now visible
    await expect(page.getByText('Child Task')).toBeVisible();
    await expect(page.getByText('Grandchild Task')).toBeVisible();
  });
});
```

## Performance Considerations

### Optimization Strategies
1. **Memoization**: Cache filtering results when task list hasn't changed
2. **Virtual Scrolling**: Ensure filtering works efficiently with virtualized lists
3. **Batch Updates**: Group task visibility changes to minimize re-renders

### Performance Tests
```typescript
test('filtering performs efficiently with large task lists', async () => {
  const largeTasks = generateTasks(1000);
  
  const startTime = performance.now();
  const filtered = largeTasks.filter(task => shouldShowTask(task, false));
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(50); // Should complete in <50ms
  expect(filtered.length).toBeLessThan(largeTasks.length);
});
```

## Backward Compatibility

### Graceful Degradation
Handle cases where API doesn't yet provide new properties:

```typescript
const shouldShowTask = (task: Task, showDeleted: boolean = false): boolean => {
  // Backward compatibility: default to false if property missing
  const hasDiscardedAncestor = task.has_discarded_ancestor ?? false;
  
  if (showDeleted) {
    return task.discarded_at !== null;
  }
  
  return task.discarded_at === null && !hasDiscardedAncestor;
};
```

### Type Safety
```typescript
interface Task {
  id: string;
  name: string;
  status: string;
  discarded_at: string | null;
  has_discarded_ancestor?: boolean; // Optional for backward compatibility
  parent_id: string | null;
}
```

## Definition of Done

- [ ] shouldShowTask logic updated to use has_discarded_ancestor property
- [ ] Task type definitions include new properties
- [ ] Normal task lists hide descendants of deleted tasks
- [ ] Deleted task view shows appropriate tasks
- [ ] All unit tests written and passing
- [ ] Integration tests verify component behavior
- [ ] End-to-end tests confirm user workflows work correctly
- [ ] Performance tests confirm no regression
- [ ] Backward compatibility maintained
- [ ] Code reviewed and approved

## Dependencies

- **Depends on**: ISS-0014 (API must provide has_discarded_ancestor property)
- **Blocks**: Complete user testing of hierarchy deletion behavior

## Related Issues
This issue is part of EP-0006 and works with:
- ISS-0013: Backend task model changes
- ISS-0014: API serialization updates
- ISS-0016: Comprehensive testing

## ⚠️ WORK BLOCKED - DO NOT BEGIN IMPLEMENTATION

**This issue is BLOCKED pending database structure refinements. Do not begin work until EP-0006 is unblocked.**

---

## Notes
- Ensure smooth transitions when switching between normal and deleted views
- Consider adding loading states if filtering becomes computationally expensive
- Test with various hierarchy sizes and structures