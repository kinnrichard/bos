# ISS-0025: Drag-Drop Sibling Detection Fix

## Overview
**Epic**: Fix Drag-and-Drop Architecture  
**Story Type**: Bug Fix (Non-Breaking)  
**Priority**: HIGH  
**Risk Level**: LOW - Adding validation and error handling  
**Depends on**: ISS-0023 (Foundation), ISS-0024 (Parent Logic)

## Problem Statement
The core bug: "item 4 dragged between items 2&3 doesn't adopt item 1 as parent" is caused by target task not being found in siblings array during position calculation.

**Debug Evidence:**
```
[Debug] Sibling analysis for same-parent drag
- targetIndex: -1  // Target task not found in siblings array
- allSiblings: [Object, Object] (2)  // Items 2&3 exist
- destinationSiblings: [Object] (1)  // Only 1 sibling found
```

**Root Cause**: `calculateRelativePositionFromTarget` function fails to find target task in siblings array, causing position calculation to fail and parent assignment to fall back to incorrect defaults.

## Acceptance Criteria

### ✅ Target Task Detection
- [ ] Target task is reliably found in siblings array
- [ ] No more `targetIndex: -1` errors in debug logs
- [ ] Proper sibling filtering includes target task for validation
- [ ] Error handling gracefully manages missing target scenarios

### ✅ Data Normalization
- [ ] Task data normalized before sibling detection  
- [ ] Consistent `parent_id` handling (null vs undefined)
- [ ] Position field validation prevents calculation errors
- [ ] Debug logging shows clear sibling analysis

### ✅ Error Fallback
- [ ] Graceful fallback when target not found in siblings
- [ ] Error logging provides actionable debugging information
- [ ] Application doesn't crash on sibling detection failure
- [ ] Fallback behavior is predictable and safe

## Implementation Details

### Update calculateRelativePositionFromTarget Function

Fix in `position-calculator.ts` around line 140:

```typescript
export function calculateRelativePositionFromTarget(
  tasks: Task[],
  dropZone: DropZoneInfo | null,
  parentId: string | null,
  draggedTaskIds: string[]
): RelativePositionCalculationResult {
  
  // Ensure we're working with normalized data
  const normalizedTasks = tasks.map(t => ({
    ...t,
    parent_id: normalizeParentId(t.parent_id),  // Convert undefined to null
    position: t.position ?? 0                   // Ensure position exists
  }));
  
  // Get siblings INCLUDING the target task for position validation
  const allSiblings = normalizedTasks.filter(t => 
    normalizeParentId(t.parent_id) === normalizeParentId(parentId)
  );
  
  const targetTask = allSiblings.find(t => t.id === dropZone?.targetTaskId);
  
  // Add validation that target exists in siblings
  if (dropZone?.targetTaskId && !targetTask) {
    console.error('Target task not found in siblings:', {
      targetTaskId: dropZone.targetTaskId,
      parentId,
      availableSiblings: allSiblings.map(s => s.id),
      allTasksCount: normalizedTasks.length
    });
    
    // Fallback to end of list - safe default behavior
    return {
      relativePosition: {
        id: draggedTaskIds[0],
        parent_id: parentId,
        position: 'last'
      },
      reasoning: {
        dropMode: 'error-fallback',
        insertionType: 'target-not-in-siblings',
        adjacentTask: null,
        relation: 'last'
      }
    };
  }
  
  // Continue with existing logic...
  // (rest of function remains unchanged, but now guaranteed to find target)
}
```

### Add Parent ID Normalization Helper

```typescript
// Add to position-calculator.ts:
function normalizeParentId(parentId: string | null | undefined): string | null {
  return parentId || null;  // Convert undefined/empty string to null
}
```

### Enhanced Debug Logging

```typescript
// Add detailed sibling analysis logging:
export function calculateRelativePositionFromTarget(/* params */) {
  // ... normalization code ...
  
  debugComponent.log('Sibling analysis:', {
    targetTaskId: dropZone?.targetTaskId,
    parentId,
    allSiblingsCount: allSiblings.length,
    allSiblingIds: allSiblings.map(s => s.id),
    targetFound: !!targetTask
  });
  
  if (dropZone?.targetTaskId && !targetTask) {
    debugComponent.error('SIBLING DETECTION FAILURE:', {
      targetTaskId: dropZone.targetTaskId,
      searchedParentId: parentId,
      availableSiblings: allSiblings.map(s => ({ id: s.id, parent_id: s.parent_id })),
      totalTasksSearched: normalizedTasks.length
    });
  }
  
  // ... rest of function ...
}
```

## File Changes Required

1. **position-calculator.ts**:
   - Update `calculateRelativePositionFromTarget` function (around line 140)
   - Add `normalizeParentId` helper function
   - Add comprehensive error handling and logging
   - Ensure target task inclusion in sibling filtering

2. **No other files need changes** - this is isolated to position calculation logic

## Testing Strategy

### Unit Tests for Sibling Detection

```typescript
// test: target task found in siblings array
test('target task is found in siblings for same-parent drop', () => {
  const tasks = [
    { id: '1', position: 1000, parent_id: null },
    { id: '2', position: 2000, parent_id: '1' },
    { id: '3', position: 3000, parent_id: '1' },
    { id: '4', position: 4000, parent_id: null }
  ];
  
  const dropZone = { mode: 'reorder', position: 'above', targetTaskId: '3' };
  const result = calculateRelativePositionFromTarget(tasks, dropZone, '1', ['4']);
  
  // Should successfully find target task and not trigger error fallback
  expect(result.reasoning.insertionType).not.toBe('target-not-in-siblings');
  expect(result.relativePosition.parent_id).toBe('1');
});

// test: handles missing target gracefully
test('graceful fallback when target not found in siblings', () => {
  const tasks = [
    { id: '1', position: 1000, parent_id: null },
    { id: '2', position: 2000, parent_id: '1' }
  ];
  
  const dropZone = { mode: 'reorder', targetTaskId: 'nonexistent' };
  const result = calculateRelativePositionFromTarget(tasks, dropZone, '1', ['4']);
  
  expect(result.reasoning.insertionType).toBe('target-not-in-siblings');
  expect(result.relativePosition.position).toBe('last');
});

// test: handles undefined vs null parent_id consistently
test('normalizes parent_id undefined to null for consistent comparison', () => {
  const tasks = [
    { id: '1', position: 1000, parent_id: null },
    { id: '2', position: 2000, parent_id: undefined }, // Mixed undefined/null
    { id: '3', position: 3000, parent_id: null }
  ];
  
  const dropZone = { mode: 'reorder', targetTaskId: '2' };
  const result = calculateRelativePositionFromTarget(tasks, dropZone, null, ['3']);
  
  // Should find task 2 despite parent_id being undefined
  expect(result.reasoning.insertionType).not.toBe('target-not-in-siblings');
});
```

### Integration Tests

```typescript
// test: reproduces and fixes the original bug
test('item 4 dragged between items 2 and 3 adopts item 1 as parent', () => {
  const tasks = [
    { id: '1', position: 1000, parent_id: null },
    { id: '2', position: 2000, parent_id: '1' },
    { id: '3', position: 3000, parent_id: '1' },
    { id: '4', position: 4000, parent_id: null }
  ];
  
  // Simulate dragging item 4 between items 2 and 3
  const dropZone = { mode: 'reorder', position: 'above', targetTaskId: '3' };
  const result = calculateRelativePositionFromTarget(tasks, dropZone, '1', ['4']);
  
  // Verify the bug is fixed
  expect(result.relativePosition.parent_id).toBe('1');
  expect(result.relativePosition.before_task_id).toBe('3');
  expect(result.reasoning.insertionType).not.toBe('target-not-in-siblings');
});
```

## Benefits
- **Bug Resolution**: Fixes the core reported issue
- **Reliability**: Prevents crashes from missing target tasks
- **Debuggability**: Clear error logging when issues occur
- **Data Safety**: Normalization prevents inconsistent data states
- **Predictability**: Fallback behavior is safe and documented

## Risk Mitigation
- **Error Handling**: Graceful fallbacks prevent application crashes
- **Logging**: Comprehensive debugging information for future issues
- **Testing**: Extensive unit tests cover edge cases
- **Data Validation**: Normalization ensures consistent data format

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Target task reliably found in siblings array
- [ ] No more `targetIndex: -1` errors in logs
- [ ] Error fallback handles edge cases gracefully
- [ ] Original bug (item 4 between 2&3) is fixed
- [ ] Unit tests cover all scenarios including edge cases
- [ ] Integration tests validate the fix works end-to-end
- [ ] Code review approved
- [ ] Manual testing confirms bug resolution

---
**Note**: This story directly fixes the reported bug while maintaining application stability. The fix is additive (better error handling) rather than changing core logic.