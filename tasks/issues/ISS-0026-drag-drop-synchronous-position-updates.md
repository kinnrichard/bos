# ISS-0026: Drag-Drop Synchronous Position Updates

## Overview
**Epic**: Fix Drag-and-Drop Architecture  
**Story Type**: Performance & Reliability Enhancement (Non-Breaking)  
**Priority**: MEDIUM  
**Risk Level**: LOW - Making async operations more predictable  
**Depends on**: ISS-0023 (Foundation), ISS-0024 (Parent Logic), ISS-0025 (Sibling Detection)

## Problem Statement
Current drag-and-drop position updates use async calculations during drag operations, which can cause DOM/database sync issues and race conditions. This leads to:

- Async position updates causing DOM/database sync issues
- Race conditions between position calculations
- Unpredictable timing of position updates
- Potential for partial updates if operations fail mid-process

## Acceptance Criteria

### ✅ Synchronous Calculation
- [ ] All position calculations done synchronously before any updates
- [ ] No async operations during position calculation phase
- [ ] Position updates calculated atomically as a batch
- [ ] Predictable timing eliminates race conditions

### ✅ Validation Before Application
- [ ] All position updates validated before applying any changes
- [ ] Validation failure prevents partial updates
- [ ] Clear error reporting when validation fails
- [ ] Atomic application of all updates or none

### ✅ Improved Reliability
- [ ] More predictable drag-drop behavior
- [ ] Fewer edge cases from timing issues
- [ ] Better error handling for position conflicts
- [ ] Enhanced debugging for position update flow

## Implementation Details

### Remove Async Position Calculations During Drag

Update `handleTaskReorder` function to calculate everything synchronously first:

```typescript
async function handleTaskReorder(event: DragSortEvent) {
  const draggedTaskId = event.item.dataset.taskId;
  if (!draggedTaskId) return;
  
  // Get dragged task IDs (single or multi-select)
  const isMultiSelectDrag = taskSelection.selectedTaskIds.has(draggedTaskId) && 
                           taskSelection.selectedTaskIds.size > 1;
  const taskIdsToMove = isMultiSelectDrag 
    ? Array.from(taskSelection.selectedTaskIds)
    : [draggedTaskId];

  // Calculate parent assignment (from previous story)
  const newParentId = getNewParentId(event.dropZone, event.dropZone?.targetTaskId);
  
  // Validate circular references
  if (newParentId && taskIdsToMove.some(id => wouldCreateCircularReference(id, newParentId))) {
    clearAllVisualFeedback();
    return;
  }

  // CALCULATE ALL POSITIONS SYNCHRONOUSLY before any updates
  const relativeUpdates: RelativePositionUpdate[] = [];
  
  for (const taskId of taskIdsToMove) {
    const relativeUpdate = calculateRelativePositionFromTarget(
      canonicalTasks,
      event.dropZone,
      newParentId,
      [taskId]  // Calculate position for each task individually
    );
    
    relativeUpdates.push({
      id: taskId,
      parent_id: newParentId,
      ...relativeUpdate.relativePosition
    });
  }
  
  // Convert all relative positions to absolute positions synchronously
  const positionUpdates = convertRelativeToPositionUpdates(canonicalTasks, relativeUpdates);
  
  // Validate ALL updates before applying ANY changes
  const validationResult = validatePositionUpdates(positionUpdates, canonicalTasks);
  if (!validationResult.valid) {
    console.error('Position update validation failed:', validationResult.errors);
    clearAllVisualFeedback();
    return;
  }
  
  debugComponent.log('Applying position updates:', {
    updateCount: positionUpdates.length,
    updates: positionUpdates.map(u => ({ id: u.id, position: u.position, parent_id: u.parent_id }))
  });
  
  // Apply all updates atomically (this is the only async operation)
  try {
    await applyAndExecutePositionUpdates(canonicalTasks, positionUpdates);
    clearAllVisualFeedback();
  } catch (error) {
    console.error('Failed to apply position updates:', error);
    clearAllVisualFeedback();
    // Could add user notification here
  }
}
```

### Add Position Update Validation

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validatePositionUpdates(
  updates: PositionUpdate[], 
  currentTasks: Task[]
): ValidationResult {
  const errors: string[] = [];
  
  // Check for duplicate positions within same parent
  const positionMap = new Map<string, number[]>();
  
  for (const update of updates) {
    const parentKey = update.parent_id || 'root';
    const positions = positionMap.get(parentKey) || [];
    
    if (positions.includes(update.position)) {
      errors.push(`Duplicate position ${update.position} for parent ${parentKey}`);
    }
    
    positions.push(update.position);
    positionMap.set(parentKey, positions);
  }
  
  // Check for valid position values
  for (const update of updates) {
    if (update.position < 0) {
      errors.push(`Invalid negative position ${update.position} for task ${update.id}`);
    }
    
    if (!Number.isInteger(update.position)) {
      errors.push(`Non-integer position ${update.position} for task ${update.id}`);
    }
  }
  
  // Check that parent IDs exist (if not null)
  const taskIds = new Set(currentTasks.map(t => t.id));
  for (const update of updates) {
    if (update.parent_id && !taskIds.has(update.parent_id)) {
      errors.push(`Parent task ${update.parent_id} does not exist for task ${update.id}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Enhanced Debug Logging

```typescript
function debugPositionCalculation(
  taskIdsToMove: string[], 
  relativeUpdates: RelativePositionUpdate[],
  positionUpdates: PositionUpdate[]
) {
  debugComponent.log('Position calculation flow:', {
    phase: 'calculation-complete',
    draggedTasks: taskIdsToMove,
    relativeUpdates: relativeUpdates.map(u => ({
      id: u.id,
      parent_id: u.parent_id,
      position: u.position,
      before_task_id: u.before_task_id,
      after_task_id: u.after_task_id
    })),
    finalPositions: positionUpdates.map(u => ({
      id: u.id,
      parent_id: u.parent_id,
      position: u.position
    }))
  });
}
```

## File Changes Required

1. **TaskList.svelte**:
   - Update `handleTaskReorder` function with synchronous calculation flow
   - Add position update validation function
   - Add enhanced debug logging
   - Ensure atomic update application

2. **position-calculator.ts** (if needed):
   - Ensure all calculation functions are synchronous
   - No changes expected based on current analysis

3. **positioning-v2.ts** (if needed):
   - Ensure conversion functions work with batch updates
   - Verify atomic update support

## Testing Strategy

### Unit Tests for Synchronous Calculation

```typescript
// test: position calculation is synchronous
test('all position calculations completed before any updates applied', () => {
  const mockTasks = createMockTaskSet();
  const dragEvent = createMockDragEvent();
  
  // Mock the async application function to verify it's called last
  const applyUpdates = jest.fn().mockResolvedValue(true);
  
  const result = calculatePositionUpdatesSync(mockTasks, dragEvent);
  
  // Should have calculated all positions without any async calls
  expect(result).toBeDefined();
  expect(result.length).toBeGreaterThan(0);
  expect(applyUpdates).not.toHaveBeenCalled(); // Async part not called yet
});

// test: validation prevents invalid updates
test('validation prevents applying invalid position updates', () => {
  const invalidUpdates = [
    { id: '1', position: -1, parent_id: null }, // Invalid negative position
    { id: '2', position: 100, parent_id: 'nonexistent' } // Invalid parent
  ];
  
  const result = validatePositionUpdates(invalidUpdates, mockTasks);
  
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.errors).toContain(expect.stringMatching(/negative position/));
  expect(result.errors).toContain(expect.stringMatching(/does not exist/));
});
```

### Integration Tests

```typescript
// test: full synchronous flow with validation
test('complete drag operation uses synchronous calculation with validation', async () => {
  const { result } = renderTaskList(mockTasks);
  
  // Simulate drag event
  const dragEvent = createDragEvent('4', 'between-2-and-3');
  
  // Track the order of operations
  const operationOrder: string[] = [];
  
  // Mock functions to track execution order
  mockCalculatePositions.mockImplementation(() => {
    operationOrder.push('calculate');
    return mockRelativeUpdates;
  });
  
  mockValidateUpdates.mockImplementation(() => {
    operationOrder.push('validate');
    return { valid: true, errors: [] };
  });
  
  mockApplyUpdates.mockImplementation(async () => {
    operationOrder.push('apply');
  });
  
  await act(async () => {
    await handleTaskReorder(dragEvent);
  });
  
  // Verify operations happened in correct order
  expect(operationOrder).toEqual(['calculate', 'validate', 'apply']);
});
```

## Benefits
- **Predictability**: Synchronous calculations eliminate race conditions
- **Reliability**: Validation prevents partial or invalid updates
- **Debuggability**: Clear operation flow easier to debug
- **Performance**: Batch calculations can be more efficient
- **Error Handling**: Better error recovery with atomic operations

## Risk Mitigation
- **Validation**: Comprehensive validation prevents invalid states
- **Atomic Updates**: All-or-nothing approach prevents partial corruption
- **Error Logging**: Clear error reporting for debugging issues
- **Fallback**: Graceful failure with visual feedback clearing

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Position calculations are synchronous before any updates
- [ ] Validation prevents invalid position updates
- [ ] Atomic application of all updates or none
- [ ] Enhanced debugging shows clear operation flow
- [ ] Unit tests cover synchronous calculation logic
- [ ] Integration tests validate complete flow
- [ ] No regressions in drag-drop functionality
- [ ] Code review approved
- [ ] Manual testing confirms improved reliability

---
**Note**: This story improves reliability and predictability without changing external behavior. Focus is on making existing functionality more robust.