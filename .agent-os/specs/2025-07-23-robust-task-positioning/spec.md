# Spec Requirements Document

> Spec: Robust Task Positioning System
> Created: 2025-07-23
> Updated: 2025-07-23
> Status: In Progress - Foundation Complete

## Overview

Replace deterministic midpoint calculation with randomized positioning within the middle 50% of available range to reduce position collisions during offline operations and concurrent task insertion.

## User Stories

### Seamless Task Insertion

As a service technician, I want to insert new tasks between existing ones without position conflicts, so that I can organize my work queue precisely without worrying about technical limitations.

When I click "Add Task" between two existing tasks, the system should create the new task with a randomized position within the middle 50% of the available range (e.g., random position between 1250-1750 when inserting between positions 1000 and 2000) that maintains the correct order. This should work whether I'm online or offline, and when multiple team members are reordering tasks simultaneously.

### Reliable Drag-and-Drop Reordering

As a team lead, I want to drag tasks to reorder them without position collisions, so that I can prioritize work for my team efficiently.

When dragging a task between two others, the system should calculate an appropriate randomized position within the available range that places it exactly where intended. The positioning should be stable - tasks shouldn't jump around or change order unexpectedly when syncing with the server.

### Offline-First Task Management

As a field technician, I want task positioning to work seamlessly offline, so that I can organize my work queue even without internet connectivity.

When working offline, I should be able to create tasks, reorder them, and have all changes sync correctly when I reconnect. If multiple technicians made changes offline, the system should merge positions intelligently without losing any task order intentions.

## Spec Scope

1. **Randomized Positioning Algorithm** - Implement integer-based positioning with randomization within middle 50% of available range
2. **Position Calculation Service** - Create a service that calculates optimal positions for insertions and moves with collision reduction
3. **UI Integration** - Ensure TaskList component uses randomized positioning for both creation and drag-and-drop
4. **Server-Side Rebalancing** - Handle position overflow and precision limits through backend rebalancing only
5. **Configuration Management** - Support configurable randomization parameters without feature flags

## Out of Scope

- Changing the database schema (position column already supports integers)
- Modifying the Rails positioning gem behavior on the backend
- Creating new UI components or changing the drag-and-drop library
- Client-side position rebalancing (server-side only)
- Feature flags or configuration toggles (greenfield application)

## Expected Deliverable

1. Tasks can be inserted between any two existing tasks with reduced position conflicts through randomization
2. Drag-and-drop reordering uses randomized positions and works smoothly
3. Offline positioning changes sync correctly with minimal conflicts
4. Server-side rebalancing handles edge cases without client-side complexity

## Implementation Details

### Core Algorithm

```typescript
export function calculatePosition(
  prevPosition: number | null,
  nextPosition: number | null,
  config: PositionConfig = {}
): number {
  const {
    defaultSpacing = 10000,
    initialPosition = 10000,
    enableRandomization = true,
    randomRangePercent = 0.5
  } = config;

  // Between two positions
  if (prevPosition !== null && nextPosition !== null) {
    const gap = nextPosition - prevPosition;

    // Use randomization only if gap is large enough
    if (enableRandomization && gap >= 4) {
      const rangeSize = gap * randomRangePercent;
      const rangeStart = prevPosition + (gap - rangeSize) / 2;
      const rangeEnd = rangeStart + rangeSize;

      return Math.floor(rangeStart + Math.random() * (rangeEnd - rangeStart));
    }

    // Fallback to midpoint for small gaps
    return Math.floor((prevPosition + nextPosition) / 2);
  }

  // At start: use negative positioning with randomization
  if (prevPosition === null && nextPosition !== null) {
    if (enableRandomization) {
      // Generate random negative position to allow infinite insertions before
      return -Math.floor(Math.random() * defaultSpacing + 1);
    }
    return Math.floor(nextPosition / 2);
  }

  // At end: use default spacing (no randomization needed)
  if (prevPosition !== null && nextPosition === null) {
    return prevPosition + defaultSpacing;
  }

  // Empty list
  return initialPosition;
}
```

### Configuration

- `randomRangePercent`: Portion of gap to randomize within (default: 0.5)
- Minimum gap of 4 for randomization (below this, use midpoint)
- No feature flags - greenfield application with consistent behavior

### Negative Positioning for Top-of-List

When positioning at the start of the list (dragging to top), use negative positions to allow infinite insertions:

- **Position Calculation**: Generate random negative position: `-Math.floor(Math.random() * defaultSpacing + 1)`
- **Special repositioned_after_id**: Use value `-1` to indicate "top of list" positioning
- **Database Support**: Position field is signed integer, supports negative values
- **Insertion Logic**: Items can always be inserted before any negative position using more negative values

### repositioned_after_id Special Values

- `null`: Task positioned by the server; client should only use the position column for sorting
- `-1`: Task was repositioned to the top of the list
- `<task_id>`: Task was positioned after the specified task ID

### Server-Side Position Calculation

The server uses `repositioned_after_id` to help calculate appropriate positions when:

1. **Client provides relative positioning**: In addition to absolute position, client sends `repositioned_after_id`. This helps preserve original intent when clients are offline
2. **Server calculates position**: Server looks up the referenced task's position and calculates new position
3. **Conflict resolution**: Server can recalculate positions if conflicts occur during concurrent operations
4. **Rebalancing trigger**: Server can detect when rebalancing is needed based on position density

**API Contract Example**:
```json
{
  "task": {
    "title": "New task",
    "repositioned_after_id": 123,  // Position after task ID 123
    "reordered_at": "2025-07-23T17:03:15.535Z"  // UTC timestamp
  }
}
```

### Client-Side DateTime Handling

**Problem**: Current `reordered_at` timestamps show local time instead of UTC, causing timezone inconsistencies.

**Requirements**:
1. **UTC Timestamps**: All datetime fields must be stored and transmitted as UTC
2. **Client-Side UTC Creation**: Implement proper UTC timestamp generation on client
3. **Timezone Consistency**: Ensure `reordered_at` reflects actual UTC time, not local time

**Implementation**:
```typescript
// Client-side UTC timestamp generation
function createUTCTimestamp(): string {
  return new Date().toISOString(); // Always returns UTC: "2025-07-23T17:03:15.535Z"
}

// Usage in positioning operations
const taskUpdate = {
  repositioned_after_id: targetTaskId,
  reordered_at: createUTCTimestamp(),
  position: calculatePosition(prevPos, nextPos)
};
```

**Database Storage**:
- Store all timestamps as UTC in database
- Convert to user's local timezone only for display purposes
- Ensure consistent ordering regardless of user timezone

