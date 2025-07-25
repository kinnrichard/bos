---
actual_hours: 0
assignees: []
created_at: '2025-07-25T15:15:00.000000'
dependencies: []
description: Replace calculateParentFromPosition() function with three clear, logical relationship rules (A, B, C) to eliminate "bizarre results" in drag-drop positioning
due_date: null
estimated_hours: 16
id: ISS-0018
labels:
- frontend
- drag-drop
- positioning
- rules
metadata:
  goal: Implement Rule A (same parent), Rule B (child insertion), and Rule C (sibling insertion) positioning logic
  owner: null
  progress: 0
  subtasks: []
  type: issue
parent: EP-0007
priority: high
status: planning
tags:
- issue
- frontend
title: Core Boundary Rules Implementation
updated_at: '2025-07-25T15:15:00.000000'
---

# Core Boundary Rules Implementation

## User Story

**As a** user organizing tasks  
**I want** predictable drag-and-drop positioning  
**So that** tasks are placed exactly where I expect them without "bizarre results"

## Problem Statement

The current `calculateParentFromPosition()` function uses complex visual hierarchy logic that causes unpredictable task positioning, especially at nesting boundaries. Users experience frustration when tasks don't land where they visually dropped them.

## Solution Overview

Replace the complex visual hierarchy logic with three clear, logical relationship rules:

### Rule A: Same Parent Positioning
When dropping between tasks with the same parent, maintain that parent relationship and relative position appropriately.

### Rule B: Child Insertion Positioning  
When dropping between a parent and its first child, make the dropped task a child of the parent.

### Rule C: Sibling Insertion Positioning
When dropping between tasks with different parents (non-parent-child relationship), adopt the first task's parent level.

## Technical Requirements

### Core Implementation
- [ ] Replace `calculateParentFromPosition()` function in `TaskList.svelte` (lines 1556-1610)
- [ ] Implement Rule A: Same parent_id positioning logic
- [ ] Implement Rule B: Parent-child insertion logic  
- [ ] Implement Rule C: Sibling insertion logic
- [ ] Preserve explicit nesting mode (`dropMode === 'nest'`) functionality
- [ ] Update variable naming from `targetItem` to `nextItem` for consistency

### Integration Requirements
- [ ] Use existing `positioning-v2.ts` system for position calculations
- [ ] Maintain compatibility with `convertRelativeToPositionUpdates()`
- [ ] Preserve `flattenedKeptTasks` usage for complete task list access
- [ ] Handle special case for "insert at beginning" (no previousItem)

### Filtered View Compatibility
- [ ] **Logical neighbor discovery**: Find actual next sibling using complete task list, not visual position
- [ ] **Complete task list access**: Use `cleanedKeptTasks` for accurate parent-child relationships  
- [ ] **Filter-resistant positioning**: Works correctly when tasks are hidden/collapsed
- [ ] **Visual vs. logical separation**: Don't assume visual neighbors are logical neighbors

### Performance Requirements
- [ ] Maintain <100ms operation time for up to 1000 tasks
- [ ] No additional memory allocation for position calculations
- [ ] Preserve existing caching mechanisms

## Acceptance Criteria

### Functional Acceptance
- [ ] **Rule A Implementation**: When `previousItem.parent_id === nextItem.parent_id`, dropped task adopts same parent and positions between them
- [ ] **Rule B Implementation**: When `nextItem.parent_id === previousItem.id`, dropped task becomes child of previousItem  
- [ ] **Rule C Implementation**: When different parents and nextItem NOT child of previousItem, dropped task adopts previousItem's parent
- [ ] **Insert at Beginning**: When no previousItem exists, task goes to root level appropriately
- [ ] **Explicit Nesting Preserved**: `dropMode === 'nest'` continues to work as before

### Technical Acceptance

- [ ] All existing unit tests continue to pass
- [ ] No regression in drag-drop performance  
- [ ] Position calculations use `calculatePosition()` from positioning-v2.ts
- [ ] Variable naming consistent with specification (`nextItem` not `targetItem`)
- [ ] Code follows existing patterns and conventions

### Quality Acceptance

- [ ] Code review completed and approved
- [ ] No complex depth-based calculations remain
- [ ] Clear, readable logic that matches specification
- [ ] Proper error handling for edge cases
- [ ] Documentation updated to reflect new logic

## Implementation Details

### Pre-Implementation Setup
From implementation checklist:

- [ ] **Current code reviewed**: `TaskList.svelte` lines 1556-1610 analyzed
- [ ] **Dependencies identified**: positioning-v2.ts system understood
- [ ] **Integration points mapped**: Zero.js sync points documented
- [ ] **Performance baseline established**: Current drag-drop timing measured

### What to Keep
```javascript
// KEEP: Explicit nesting mode
if (dropMode === 'nest') {
  const targetItem = flattenedKeptTasks[dropIndex];
  return targetItem?.task.id;
}
```

### What to Replace
```javascript
// REPLACE: All complex depth-based logic (lines 1585-1609)
// REPLACE: Special case handling that doesn't match Rules A, B, C
// REPLACE: Variable name 'targetItem' with 'nextItem'
```

### New Implementation Pattern
```javascript
function calculateParentFromBoundaryRules(previousItem, nextItem) {
  // Rule A: Same parent positioning
  if (previousItem && nextItem && previousItem.parent_id === nextItem.parent_id) {
    return previousItem.parent_id;
  }
  
  // Rule B: Child insertion positioning  
  if (previousItem && nextItem && nextItem.parent_id === previousItem.id) {
    return previousItem.id;
  }
  
  // Rule C: Sibling insertion positioning
  if (previousItem && nextItem && nextItem.parent_id !== previousItem.id) {
    return previousItem.parent_id;
  }
  
  // Special cases for boundaries
  // ... handle insert at beginning, end, etc.
}
```

### Rule-Specific Implementation Checklist

#### Rule A: Same Parent Positioning
- [ ] **Logic implemented**: `previousItem.parent_id === nextItem.parent_id` check
- [ ] **Position calculation**: Uses `calculatePosition()` from positioning-v2.ts
- [ ] **Sibling discovery**: Finds actual next sibling, not visual neighbor
- [ ] **Filtering support**: Works correctly with filtered views
- [ ] **Unit tests written**: All scenarios covered
- [ ] **Manual testing**: Visual verification completed

#### Rule B: Child Insertion Positioning  
- [ ] **Logic implemented**: `nextItem.parent_id === previousItem.id` check
- [ ] **Parent assignment**: Correctly sets `draggedItem.parent_id = previousItem.id`
- [ ] **First child positioning**: Uses `calculatePosition(null, firstChild?.position)`
- [ ] **Auto-expansion**: Parent task expands to show new child
- [ ] **Unit tests written**: All scenarios covered
- [ ] **Manual testing**: Visual verification completed

#### Rule C: Sibling Insertion Positioning
- [ ] **Logic implemented**: Different parents, not parent-child relationship
- [ ] **Parent adoption**: `draggedItem.parent_id = previousItem.parent_id`
- [ ] **Position calculation**: Uses positioning-v2.ts correctly
- [ ] **Hierarchy maintenance**: Preserves existing relationships
- [ ] **Unit tests written**: All scenarios covered
- [ ] **Manual testing**: Visual verification completed

### Special Cases Implementation
- [ ] **Insert at beginning**: Handles `dropIndex === 0` correctly
- [ ] **Insert at end**: Handles end-of-list scenarios
- [ ] **Explicit nesting preserved**: `dropMode === 'nest'` functionality unchanged
- [ ] **Variable naming updated**: `targetItem` → `nextItem` consistently
- [ ] **Edge cases handled**: All boundary conditions covered

## Testing Requirements

### Unit Tests
- [ ] Test Rule A with same parent scenarios
- [ ] Test Rule B with parent-child scenarios  
- [ ] Test Rule C with different parent scenarios
- [ ] Test insert at beginning edge case
- [ ] Test explicit nesting mode preservation

### Integration Tests  
- [ ] Test with existing positioning-v2.ts system
- [ ] Test with real task hierarchies
- [ ] Test performance with large task lists
- [ ] Test filtered view scenarios

### Performance Testing
- [ ] **Speed benchmarks**: Operations under 100ms threshold
- [ ] **Memory testing**: No leaks or excessive allocation
- [ ] **Scalability testing**: Performance with large task counts

## Implementation Notes

### File Locations
- **Primary**: `frontend/src/lib/components/jobs/TaskList.svelte`
- **Positioning**: `frontend/src/lib/shared/utils/positioning-v2.ts`
- **Tests**: Create new test files for boundary rule logic

### Integration Points
- Zero.js real-time sync system
- Task selection and multi-select functionality
- Existing drag-drop event handlers

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All checklist items from implementation checklist completed
- [ ] Code review completed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Performance benchmarks maintained
- [ ] Documentation updated
- [ ] Ready for QA testing

## Dependencies

### Blocked By
- None (ready to start)

### Blocks  
- [ISS-0019] Multi-Select Parent Filtering Enhancement
- [ISS-0020] Edge Cases & Error Handling
- [ISS-0021] Testing & Validation Framework

## Related Issues
This issue is part of EP-0007 and foundational for:
- ISS-0019: Multi-select filtering enhancements
- ISS-0020: Edge case handling
- ISS-0021: Comprehensive testing

## Resources

- [Drag-Drop Boundary Specification](../../docs/drag-drop-boundary-specification.md)
- [TaskList.svelte Implementation](../../frontend/src/lib/components/jobs/TaskList.svelte)
- [positioning-v2.ts System](../../frontend/src/lib/shared/utils/positioning-v2.ts)

## Notes
- This is the foundational implementation that all other issues depend on
- Performance is critical - must maintain <100ms for smooth user experience
- Backward compatibility with explicit nesting mode must be preserved
- All existing functionality must continue to work without regression