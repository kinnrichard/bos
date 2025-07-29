# Fix Drag-and-Drop Architecture

## Problem Summary

The current drag-and-drop system has fundamental architectural issues that cause parent assignment bugs like "item 4 dragged between items 2&3 doesn't adopt item 1 as parent".

**Root causes:**
- Multiple competing data sources (`cleanedTasks` vs `cleanedKeptTasks`)
- Complex parent assignment with 3+ different calculation methods
- Async position updates causing DOM/database sync issues
- Optional/nullable position fields causing calculation errors
- Mixed coordinate systems (DOM indices vs database positions)

**Debug evidence:**
```
[Debug] Sibling analysis for same-parent drag
- targetIndex: -1  // Target task not found in siblings array
- allSiblings: [Object, Object] (2)  // Items 2&3 exist
- destinationSiblings: [Object] (1)  // Only 1 sibling found
```

## Implementation Plan

### Phase 0: Type System Standardization

**Goal:** Standardize position and parent_id fields to required, properly typed fields before data consolidation.

#### 0.1 Update Interface Definitions
```typescript
// Update position-calculator.ts interface:
export interface Task {
  id: string;
  position: number;          // Remove optional - make required
  parent_id: string | null;  // Change from string | undefined to string | null
  repositioned_after_id?: string | null;
  title?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  assigned_to?: {
    id: string;
    name: string;
    initials: string;
  };
}

// Update PositionUpdate interface:
export interface PositionUpdate {
  id: string;
  position: number;
  parent_id: string | null; // Remove optional, standardize on null
  repositioned_after_id?: string | null;
}

// Update RelativePositionUpdate interface:
export interface RelativePositionUpdate {
  id: string;
  parent_id: string | null;  // Change from optional string to string | null
  before_task_id?: string;
  after_task_id?: string;
  position?: 'first' | 'last';
}
```

#### 0.2 Data Normalization Function
```typescript
// Ensure all tasks have required fields before processing:
function normalizeTaskData(tasks: any[]): Task[] {
  return tasks.map(task => ({
    ...task,
    position: task.position ?? 0,           // Default position if missing
    parent_id: task.parent_id || null,      // Convert undefined to null
  }));
}
```

#### 0.3 Update All Data Entry Points
```typescript
// In TaskList.svelte, normalize data immediately after props:
const normalizedTasks = $derived(normalizeTaskData(tasks));
const normalizedKeptTasks = $derived(normalizeTaskData(keptTasks));
```

### Phase 1: Data Consolidation

**Goal:** Eliminate `cleanedTasks` vs `cleanedKeptTasks` split and establish single source of truth.

#### 1.1 Remove Data Duplication (TaskList.svelte lines 88-89, 303-305)
```typescript
// REMOVE these duplicated reactive statements:
const cleanedTasks = $derived(cleanupSelfReferences(tasks));
const cleanedKeptTasks = $derived(cleanupSelfReferences(keptTasks));
const cleanedKeptTasksHierarchy = $derived(
  hierarchyManager.organizeTasksSimple(cleanedKeptTasks as BaseTask[])
);

// REPLACE with single canonical source:
const canonicalTasks = $derived(() => {
  // Combine and deduplicate normalized tasks
  const allTasks = [...normalizedTasks, ...normalizedKeptTasks];
  const uniqueTasks = Array.from(
    new Map(allTasks.map(task => [task.id, task])).values()
  );
  // NOTE: Remove cleanupSelfReferences - handle circular refs server-side only
  return uniqueTasks;
});
```

#### 1.2 Update All Derived Computations
```typescript
// Update these to use canonicalTasks:
const hierarchicalTasks = $derived(
  hierarchyManager.organizeTasksHierarchicallyWithFilter(
    canonicalTasks as BaseTask[],  // was cleanedTasks
    shouldShowTask
  )
);

const flattenedKeptTasks = $derived.by(() => {
  return hierarchyManager.flattenTasks(
    hierarchyManager.organizeTasksSimple(canonicalTasks)  // was cleanedKeptTasksHierarchy
  );
});
```

#### 1.3 Remove Client-Side Circular Reference Code
**Note:** Per project requirements, circular references should be handled server-side only.
```typescript
// REMOVE cleanupSelfReferences function entirely from TaskList.svelte (lines 75-85)
// REMOVE all cleanupSelfReferences calls
// Server should ensure data integrity before sending to client
```

### Phase 2: Simplify Parent Assignment

#### 2.1 Replace Complex calculateParentFromPosition Logic
Remove the entire `calculateParentFromPosition` function (lines 1481-1538) and replace with simple logic:

```typescript
// In handleTaskReorder function, replace lines 1340-1347:
function getNewParentId(dropZone: DropZoneInfo | null, targetTaskId?: string): string | null {
  // Nesting mode: target becomes parent
  if (dropZone?.mode === 'nest' && targetTaskId) {
    return targetTaskId;
  }
  
  // Reorder mode: adopt target's parent (sibling relationship)
  if (targetTaskId) {
    const targetTask = canonicalTasks.find(t => t.id === targetTaskId);
    return targetTask?.parent_id || null;
  }
  
  // No target: root level
  return null;
}
```

#### 2.2 Update handleTaskReorder Function
```typescript
async function handleTaskReorder(event: DragSortEvent) {
  const draggedTaskId = event.item.dataset.taskId;
  if (!draggedTaskId) return;

  // Simple parent calculation
  const newParentId = getNewParentId(event.dropZone, event.dropZone?.targetTaskId);
  
  // Validate against circular references
  if (newParentId && wouldCreateCircularReference(draggedTaskId, newParentId)) {
    clearAllVisualFeedback();
    return;
  }
  
  // Continue with positioning logic...
}
```

### Phase 3: Fix Sibling Detection

#### 3.1 Update calculateRelativePositionFromTarget 
The bug occurs because target task isn't found in siblings array. Fix in position-calculator.ts:

```typescript
// In calculateRelativePositionFromTarget function, around line 140:
export function calculateRelativePositionFromTarget(
  tasks: Task[],
  dropZone: DropZoneInfo | null,
  parentId: string | null,
  draggedTaskIds: string[]
): RelativePositionCalculationResult {
  
  // Ensure we're working with normalized data
  const normalizedTasks = tasks.map(t => ({
    ...t,
    parent_id: normalizeParentId(t.parent_id),
    position: t.position || 0
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
      availableSiblings: allSiblings.map(s => s.id)
    });
    // Fallback to end of list
    return {
      relativePosition: {
        id: draggedTaskIds[0],
        parent_id: parentId ?? undefined,
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
}
```

### Phase 4: Synchronous Position Updates

#### 4.1 Remove Async Position Calculations During Drag
```typescript
// In handleTaskReorder, calculate everything synchronously first:
async function handleTaskReorder(event: DragSortEvent) {
  // ... existing validation ...
  
  // Calculate ALL positions synchronously before any updates
  const relativeUpdates = calculateAllRelativePositions(/* params */);
  const positionUpdates = convertRelativeToPositionUpdates(canonicalTasks, relativeUpdates);
  
  // Validate all updates before applying
  const validationResult = validatePositionUpdates(positionUpdates);
  if (!validationResult.valid) {
    console.error('Position update validation failed:', validationResult.errors);
    clearAllVisualFeedback();
    return;
  }
  
  // Apply all updates atomically
  await applyAndExecutePositionUpdates(canonicalTasks, positionUpdates);
}
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests for Parent Assignment
```typescript
// test: parent assignment for sibling drops
test('dragging item between siblings adopts their parent', () => {
  const tasks = [
    { id: '1', position: 1000, parent_id: null },
    { id: '2', position: 2000, parent_id: '1' },
    { id: '3', position: 3000, parent_id: '1' },
    { id: '4', position: 4000, parent_id: null }
  ];
  
  const dropZone = { mode: 'reorder', position: 'above', targetTaskId: '3' };
  const result = calculateRelativePositionFromTarget(tasks, dropZone, '1', ['4']);
  
  expect(result.relativePosition.parent_id).toBe('1');
  expect(result.relativePosition.before_task_id).toBe('3');
});
```

#### 5.2 Integration Tests
```typescript
// test: full drag flow for the reported bug
test('drag item 4 between items 2 and 3 adopts item 1 as parent', async () => {
  // Setup: 1 -> 2, 3; 4 (root)
  // Action: drag 4 between 2 and 3
  // Expected: 1 -> 2, 4, 3
});
```

### Phase 6: Implementation Steps

#### 6.1 File Changes Required
1. **TaskList.svelte**: Remove data duplication, simplify parent logic
2. **position-calculator.ts**: Fix sibling detection, add validation, update interfaces
3. **positioning-v2.ts**: Update to handle canonical data source
4. **Task model**: Update position/parent_id types to required fields

#### 6.2 Implementation Strategy (Greenfield)
1. Update type interfaces first (Phase 0)
2. Implement data consolidation (Phase 1)
3. Replace parent assignment logic (Phase 2)
4. Fix sibling detection (Phase 3)
5. Add synchronous position updates (Phase 4)
6. Add comprehensive tests (Phase 5)

### Success Criteria

✅ Item 4 dragged between items 2&3 correctly adopts item 1 as parent  
✅ No more `targetIndex: -1` errors in debug logs  
✅ Single canonical data source with no duplication  
✅ Consistent parent_id and position types throughout  
✅ All existing drag-drop functionality preserved  

### Risk Mitigation

- **Data Loss**: Validate all position updates before applying
- **Type Safety**: Use TypeScript strict mode to catch type mismatches
- **Regression**: Comprehensive test suite for existing functionality
- **Data Integrity**: Server-side validation of circular references

---

## Next Steps

1. Start with Phase 0 (type system standardization) as it's foundational
2. Add logging/debugging for development validation
3. Create comprehensive test cases before making changes
4. Implement phases sequentially for systematic validation