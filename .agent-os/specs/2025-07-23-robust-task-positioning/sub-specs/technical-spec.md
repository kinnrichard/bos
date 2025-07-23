# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-23-robust-task-positioning/spec.md

> Created: 2025-07-23
> Version: 1.0.0

## Technical Requirements

- **Fractional positioning algorithm** that calculates positions between any two existing positions
- **Position precision handling** to manage floating-point limitations and prevent collisions
- **Offline-first positioning** that generates stable positions without server coordination
- **Conflict-free merging** when multiple users reorder tasks simultaneously
- **Drag-and-drop integration** with SortableJS library for smooth UI updates
- **Performance optimization** for large task lists (100+ items)
- **Position rebalancing** when precision limits are approached

## Approach Options

**Option A: String-based Fractional Indexing**
- Pros: Infinite precision, used by systems like Figma, no floating-point issues
- Cons: More complex implementation, requires custom comparison logic, larger storage

**Option B: Decimal-based Fractional Positioning** (Selected)
- Pros: Simple implementation, native database support, easy sorting, minimal changes
- Cons: Floating-point precision limits, potential need for rebalancing

**Option C: Timestamp + Random Suffix**
- Pros: Simple to implement, naturally unique
- Cons: Non-deterministic, large numbers, poor offline behavior

**Rationale:** Option B provides the best balance of simplicity and functionality. The existing database already supports decimal positions, and floating-point precision (15-17 significant digits) allows for thousands of insertions before rebalancing is needed. This approach requires minimal changes to the existing system.

## Implementation Details

### Position Calculation Algorithm

```typescript
// Calculate position between two tasks
function calculatePosition(prevPosition: number | null, nextPosition: number | null): number {
  // If inserting at start
  if (prevPosition === null && nextPosition !== null) {
    return nextPosition / 2;
  }
  
  // If inserting at end
  if (prevPosition !== null && nextPosition === null) {
    return prevPosition + 1000;
  }
  
  // If inserting between two tasks
  if (prevPosition !== null && nextPosition !== null) {
    return (prevPosition + nextPosition) / 2;
  }
  
  // If list is empty
  return 1000;
}
```

### Precision Management

```typescript
// Check if positions are too close (potential precision issue)
function needsRebalancing(positions: number[]): boolean {
  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1];
    // If gap is less than 1e-10, we're approaching precision limits
    if (gap < 1e-10) return true;
  }
  return false;
}

// Rebalance positions to maintain even spacing
function rebalancePositions(count: number, startPos = 1000): number[] {
  const spacing = 1000;
  return Array.from({ length: count }, (_, i) => startPos + (i * spacing));
}
```

### Integration Points

1. **TaskList.svelte** - Update task creation to use fractional positioning
2. **positioning.ts mutator** - Replace timestamp-based logic with fractional algorithm
3. **Drag-and-drop handlers** - Calculate new positions during reordering
4. **Zero.js mutations** - Ensure position calculations work offline
5. **Backend validation** - Add position validation in Rails model

## External Dependencies

No new external dependencies are required. The implementation uses:
- Existing SortableJS for drag-and-drop (already in project)
- Native JavaScript number type for positions
- Existing Zero.js infrastructure for sync

## Performance Considerations

- Position calculations are O(1) operations
- Sorting remains O(n log n) as positions are numeric
- Rebalancing is O(n) but rarely needed
- No additional database queries required
- Client-side calculations minimize server load

## Migration Strategy

1. Existing integer positions (1, 2, 3) continue to work
2. New positions use fractional values (1.5, 2.25, etc.)
3. Gradual migration as tasks are reordered
4. No database migration required (position column already decimal)

## Edge Cases

1. **Precision exhaustion**: Implement rebalancing when gaps < 1e-10
2. **Concurrent edits**: Zero.js handles conflict resolution automatically
3. **Large position values**: Reset to reasonable range during rebalancing
4. **Import/export**: Maintain position order but rebalance values