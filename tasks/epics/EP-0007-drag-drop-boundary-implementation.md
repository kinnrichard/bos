---
actual_hours: null
assignees: []
created_at: '2025-07-25T15:15:00.000000'
dependencies: []
description: Replace complex visual hierarchy logic with clear, predictable logical relationship rules (A, B, C) that eliminate "bizarre results" in drag-drop operations
due_date: null
estimated_hours: 60
id: EP-0007
labels:
- drag-drop
- ui
- boundary-rules
- positioning
metadata:
  goal: Eliminate "bizarre results" in drag-drop operations and provide intuitive positioning that matches user expectations
  owner: null
  progress: 0
  subtasks:
  - ISS-0018
  - ISS-0019
  - ISS-0020
  - ISS-0021
  type: epic
parent: null
priority: high
status: open
tags:
- epic
- drag-drop
title: Drag-Drop Boundary Implementation
updated_at: '2025-07-25T15:15:00.000000'
---

# Drag-Drop Boundary Implementation

## Overview
Users experience "bizarre results" when dragging tasks at nesting boundaries, leading to unexpected task positioning, broken parent-child relationships, frustrated user experience, and loss of task organization integrity. This epic implements a solution to replace complex visual hierarchy logic with clear, predictable logical relationship rules.

## Business Problem

Users experience "bizarre results" when dragging tasks at nesting boundaries, leading to:

- Unexpected task positioning
- Broken parent-child relationships  
- Frustrated user experience
- Loss of task organization integrity

## Solution Overview

Replace complex visual hierarchy logic with clear, predictable logical relationship rules (A, B, C) that:

- Use parent_id relationships instead of visual depth calculations
- Handle filtered views correctly
- Maintain offline-first architecture compatibility
- Preserve existing multi-select functionality

### The Three Core Rules

#### Rule A: Same Parent Positioning
When dropping between tasks with the same parent, maintain that parent relationship and position appropriately.

#### Rule B: Child Insertion Positioning  
When dropping between a parent and its first child, make the dropped task a child of the parent.

#### Rule C: Sibling Insertion Positioning
When dropping between tasks with different parents (non-parent-child relationship), adopt the first task's parent level.

## Success Criteria

### User Experience
- ✅ Zero "bizarre results" in drag-drop operations
- ✅ Intuitive positioning matches user expectations
- ✅ Consistent behavior across all scenarios
- ✅ Smooth multi-select operations

### Technical Requirements  
- ✅ Drag-drop operations complete <100ms
- ✅ All parent-child relationships remain valid
- ✅ Position uniqueness maintained
- ✅ Offline sync works without conflicts
- ✅ 100% backwards compatibility

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Core Rules Implementation** (ISS-0018)
   - Replace `calculateParentFromPosition()` with Rules A, B, C logic
   - Implement Rule A: Same parent positioning  
   - Implement Rule B: Child insertion positioning
   - Implement Rule C: Sibling insertion positioning

2. **Multi-Select Integration** (ISS-0019)
   - Enhance existing Gs exclusion logic
   - Apply Rules A, B, C to filtered items
   - Maintain performance <100ms

### Phase 2: Robustness (Week 2)
3. **Edge Cases & Error Handling** (ISS-0020)
   - Handle boundary conditions (insert at beginning, collapsed children)
   - Implement invalid operation prevention
   - Add rollback support

4. **Testing & Validation** (ISS-0021)
   - Comprehensive Playwright E2E tests for all scenarios
   - Unit tests for each rule
   - Performance benchmarks
   - Real-time sync validation

### Phase 3: Validation (Week 3)
- Regression testing
- User acceptance testing
- Production deployment

## Acceptance Criteria

### Functional Acceptance
- [ ] All boundary rules (A, B, C) implemented correctly
- [ ] Multi-select filtering works as specified
- [ ] Edge cases handled gracefully
- [ ] No regression in existing functionality

### Technical Acceptance  
- [ ] All automated tests passing
- [ ] Performance benchmarks met (<100ms)
- [ ] Code review completed
- [ ] Documentation updated

### Business Acceptance
- [ ] User testing validates intuitive behavior
- [ ] No "bizarre results" reported
- [ ] Task hierarchy integrity maintained
- [ ] Ready for production deployment

## Risks & Mitigation

### 🔴 High Risk: Breaking Existing Functionality
**Impact**: Critical  
**Probability**: Medium  
**Mitigation**: 
- Feature flags for safe rollout
- Comprehensive regression testing
- Immediate rollback capability

### 🟡 Medium Risk: Performance Degradation
**Impact**: Medium  
**Probability**: Low  
**Mitigation**:
- Performance benchmarks in CI
- Optimize parent_id queries
- Cache calculations where appropriate

### 🟢 Low Risk: Edge Case Scenarios  
**Impact**: Low
**Probability**: Medium
**Mitigation**:
- Extensive edge case testing
- Clear error handling
- User feedback collection

## Dependencies

### Internal Dependencies
- ✅ Drag-drop boundary specification (completed)
- ✅ positioning-v2.ts system (already implemented)
- ⏳ Playwright test infrastructure
- ⏳ Performance monitoring setup

### External Dependencies
- Zero.js real-time sync system
- PostgreSQL database performance
- Browser drag-and-drop API compatibility

## Related Issues

- [ISS-0018](../issues/ISS-0018-core-boundary-rules-implementation.md): Core Boundary Rules Implementation
- [ISS-0019](../issues/ISS-0019-multiselect-filtering-enhancement.md): Multi-Select Parent Filtering Enhancement
- [ISS-0020](../issues/ISS-0020-edge-cases-error-handling.md): Edge Cases & Error Handling
- [ISS-0021](../issues/ISS-0021-testing-validation-framework.md): Testing & Validation Framework

## Technical Considerations

### Current Implementation Issues
The current `calculateParentFromPosition()` function (TaskList.svelte lines 1556-1610) uses complex visual hierarchy logic that causes unpredictable task positioning, especially at nesting boundaries.

**Specific Issues Identified:**
- **Variable naming inconsistency**: Uses `targetItem` instead of specification's `nextItem`
- **Complex depth-based logic**: Lines 1585-1609 use visual hierarchy instead of logical relationships
- **Filtered view problems**: Visual neighbors ≠ logical neighbors when tasks are hidden

### Target Architecture
Replace visual depth calculations with logical parent_id relationship rules:
- Use existing positioning-v2.ts system for position calculations
- Maintain compatibility with `convertRelativeToPositionUpdates()`
- Preserve `flattenedKeptTasks` usage for complete task list access

### Implementation Code Patterns

#### What to Keep
```javascript
// KEEP: Explicit nesting mode (lines 1559-1562)
if (dropMode === 'nest') {
  const targetItem = flattenedKeptTasks[dropIndex];
  return targetItem?.task.id;
}

// KEEP: Multi-select Gs exclusion logic (lines 1478-1483)
const rootTaskIds = sortedTaskIds.filter(taskId => {
  const task = cleanedKeptTasks.find(t => t.id === taskId);
  return !task?.parent_id || !sortedTaskIds.includes(task.parent_id);
});
```

#### What to Replace
```javascript
// REPLACE: Complex depth-based logic (lines 1585-1609)
// REPLACE: Variable name 'targetItem' with 'nextItem' for consistency
// REPLACE: Visual hierarchy calculations with logical parent_id relationships
```

#### New Implementation Pattern
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
  
  // Handle boundary cases...
}
```

### Filtered View Compatibility
- **Logical neighbor discovery**: Find actual next sibling using complete task list, not visual position
- **Complete task list access**: Use `cleanedKeptTasks` for accurate parent-child relationships
- **Filter-resistant positioning**: Works correctly when tasks are hidden/collapsed

### Performance Requirements
- **Speed benchmarks**: <100ms operation time for up to 1000 tasks
- **Memory efficiency**: No memory leaks or excessive allocation
- **Scalability testing**: Performance validation with 10, 100, 500, 1000 task counts
- **Stress testing**: High-frequency drag operations handled gracefully
- **Multi-select performance**: <100ms for up to 100 selected tasks

### Real-time Sync Integration
- **Multi-user collaboration**: Position changes sync across users immediately via Zero.js
- **Concurrent operations**: Simultaneous drags resolve without conflicts
- **Conflict resolution**: Proper handling when multiple users drag simultaneously
- **Zero.js validation**: Real-time sync continues working with new boundary logic

### Cross-Browser Compatibility
- **Browser support**: Chrome, Firefox, Safari validation required
- **Device testing**: Desktop, tablet, mobile drag scenarios
- **Drag API compatibility**: Consistent behavior across platforms
- **Performance consistency**: Benchmarks met on all supported browsers

### Rollback Procedures
- **Immediate rollback**: Feature flag disable (<1 hour response time)
- **Data recovery**: Database position restoration procedures if needed
- **Validation scripts**: Position integrity verification tools
- **Graceful degradation**: System remains functional during rollback

## Definition of Done

### Functional Completion
- [ ] All boundary rules (A, B, C) implemented correctly
- [ ] Multi-select filtering works as specified (Gs exclusion preserved)
- [ ] Edge cases handled gracefully (insert at beginning, collapsed children)
- [ ] Variable naming updated (`targetItem` → `nextItem` consistently)
- [ ] Explicit nesting mode preserved (`dropMode === 'nest'`)
- [ ] Filtered view compatibility validated

### Technical Validation
- [ ] All automated tests passing (unit + E2E + performance)
- [ ] Cross-browser compatibility verified (Chrome, Firefox, Safari)
- [ ] Real-time sync integration tested (multi-user scenarios)
- [ ] Memory leak testing completed (no excessive allocation)
- [ ] Performance benchmarks met (<100ms for all scenarios)
- [ ] Code review completed and approved

### Production Readiness
- [ ] Feature flags configured for safe rollout
- [ ] Rollback procedures tested and documented
- [ ] Monitoring and alerting setup for boundary operations
- [ ] User acceptance testing passed with zero "bizarre results"
- [ ] Documentation complete (implementation + user guidance)
- [ ] Production deployment successful with health metrics validated

## Notes

- This implementation maintains 100% backward compatibility
- Feature flags will enable safe rollout and immediate rollback if needed
- Real-time sync with Zero.js must continue to work seamlessly
- All existing multi-select functionality must be preserved

**Next Steps**: Review and approve epic scope, then begin implementation with ISS-0018.