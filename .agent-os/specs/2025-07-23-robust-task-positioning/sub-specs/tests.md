# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-23-robust-task-positioning/spec.md

> Created: 2025-07-23
> Version: 1.0.0

## Test Coverage

### Unit Tests

**positioning-v2.ts**
- calculatePosition returns midpoint between two positions
- calculatePosition handles insertion at start of list
- calculatePosition handles insertion at end of list
- calculatePosition handles empty list
- getAdjacentPositions finds correct neighbors in scope
- getAdjacentPositions handles edge cases (first/last items)
- needsRebalancing detects precision issues
- rebalancePositions creates evenly spaced positions

**TaskList.svelte position calculations**
- Inline task creation uses fractional positions
- Position calculation works when inserting between tasks
- Position calculation works when adding to end
- Handles missing position values gracefully

### Integration Tests

**Task Creation Flow**
- Creating task between existing tasks assigns fractional position
- Multiple insertions between same tasks work correctly
- Positions remain stable after page reload
- Offline task creation syncs with correct positions

**Drag and Drop Reordering**
- Dragging task between others calculates fractional position
- Multiple reorderings maintain correct order
- Drag to start/end of list works correctly
- Cancelled drag operations don't affect positions

### E2E Tests

**tests/positioning.spec.ts**
- User can insert multiple tasks between existing ones without conflicts
- Drag-and-drop reordering maintains stable positions
- Offline positioning changes sync correctly when reconnected
- Large lists (100+ tasks) can be reordered smoothly
- Position values don't grow unbounded after many operations

### Edge Case Tests

**Precision Limits**
- System handles 1000+ insertions between same positions
- Rebalancing triggers when precision exhausted
- Rebalanced positions maintain correct order

**Concurrent Operations**
- Two users reordering simultaneously resolve correctly
- Offline changes from multiple users merge properly
- No position collisions in high-concurrency scenarios

## Mocking Requirements

- **Date.now():** Mock to return consistent values for offline ID generation
- **Network conditions:** Simulate offline/online transitions
- **Zero.js sync:** Mock sync delays to test concurrent operations
- **Random values:** Mock any randomness for deterministic tests

## Performance Tests

- Measure time to calculate position for 1000 insertions
- Verify sorting performance with 1000+ tasks
- Test UI responsiveness during drag operations
- Monitor memory usage during rebalancing operations

## Test Data Scenarios

1. **Empty job with no tasks** - Test initial task creation
2. **Job with 2 tasks** - Test insertion between
3. **Job with 100+ tasks** - Test performance and precision
4. **Mixed position values** - Test migration from integer positions
5. **Corrupted positions** - Test recovery and rebalancing

## Regression Tests

- Ensure existing integer positions still work
- Verify backward compatibility with current task ordering
- Check that position column constraints are maintained
- Validate Zero.js sync continues to work correctly