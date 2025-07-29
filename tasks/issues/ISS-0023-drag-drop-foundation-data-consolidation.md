# ISS-0023: Drag-Drop Foundation & Data Consolidation

## Overview
**Epic**: Fix Drag-and-Drop Architecture  
**Story Type**: Foundation (Breaking Changes)  
**Priority**: HIGH  
**Risk Level**: BREAKING - Application may be unstable during implementation but MUST work when complete

## Problem Statement
The current drag-and-drop system has fundamental architectural issues caused by:
- Multiple competing data sources (`cleanedTasks` vs `cleanedKeptTasks`)
- Optional/nullable position fields causing calculation errors
- Mixed type handling for `parent_id` (string | undefined vs string | null)
- Client-side circular reference bandaids

## Acceptance Criteria

### ✅ Type System Standardization
- [ ] All Task interfaces use required `position: number` (no optional)
- [ ] All `parent_id` fields use `string | null` consistently (no undefined)
- [ ] Data normalization function handles existing data gracefully
- [ ] TypeScript compilation passes with strict mode
- [ ] All existing tasks validated to have position values

### ✅ Data Source Consolidation  
- [ ] Single `canonicalTasks` data source implemented
- [ ] All 20+ references to `cleanedTasks`/`cleanedKeptTasks` updated
- [ ] `cleanupSelfReferences` function removed (server-side validation only)
- [ ] Existing UI functionality completely preserved
- [ ] No data duplication in reactive statements

### ✅ Application Stability
- [ ] Drag-and-drop functionality works after implementation
- [ ] No runtime errors from missing position fields
- [ ] All existing features work as before
- [ ] Comprehensive testing validates stability

## Implementation Details

### Phase 0: Type System Standardization

#### Update Interface Definitions
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

#### Data Normalization Function
```typescript
// Add to TaskList.svelte - ensure all tasks have required fields:
function normalizeTaskData(tasks: any[]): Task[] {
  return tasks.map(task => {
    if (task.position === undefined || task.position === null) {
      console.warn(`Task ${task.id} missing position, defaulting to 0`);
    }
    return {
      ...task,
      position: task.position ?? 0,           // Default position if missing
      parent_id: task.parent_id || null,      // Convert undefined to null
    };
  });
}

// In TaskList.svelte, normalize data immediately after props:
const normalizedTasks = $derived(normalizeTaskData(tasks));
const normalizedKeptTasks = $derived(normalizeTaskData(keptTasks));
```

### Phase 1: Data Consolidation

#### Remove Data Duplication (TaskList.svelte lines 88-89, 303-305)
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

#### Update All Derived Computations
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

#### Remove Client-Side Circular Reference Code
```typescript
// REMOVE cleanupSelfReferences function entirely from TaskList.svelte (lines 75-85)
// REMOVE all cleanupSelfReferences calls throughout the file
// Server should ensure data integrity before sending to client
```

## File Changes Required
1. **TaskList.svelte**: 
   - Remove data duplication (lines 88-89, 303-305)
   - Add normalization functions
   - Update all derived computations
   - Remove cleanupSelfReferences (lines 75-85)
   - Update all 20+ references to use canonicalTasks

2. **position-calculator.ts**: 
   - Update Task interface (make position required, parent_id string | null)
   - Update PositionUpdate interface
   - Update RelativePositionUpdate interface

3. **positioning-v2.ts**: 
   - Update to handle canonical data source
   - Ensure compatibility with new interfaces

4. **Task model files**: 
   - Update position/parent_id types to match new interfaces

## Safety Measures
- [ ] Add comprehensive data validation FIRST
- [ ] Ensure all existing tasks have position values before type changes
- [ ] Test normalization thoroughly with actual data
- [ ] Update all references atomically in single commit
- [ ] Extensive manual testing before considering complete
- [ ] Database migration script if needed for position field

## Testing Strategy
- [ ] Unit tests for normalization function
- [ ] Integration tests for canonicalTasks derivation
- [ ] Type safety tests with TypeScript strict mode
- [ ] Manual testing of drag-drop functionality
- [ ] Performance testing of single data source approach

## Risk Mitigation
- **Data Loss**: Validate all existing data has position fields before changes
- **Runtime Errors**: Comprehensive normalization prevents undefined access
- **Type Safety**: Use TypeScript strict mode to catch mismatches early
- **Rollback Plan**: Keep git commit granular for easy rollback if needed

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Application stable and drag-drop functional
- [ ] No TypeScript compilation errors
- [ ] All tests pass
- [ ] Code review approved
- [ ] Manual testing validates no regressions

---
**Note**: This story contains ALL breaking changes. Application MUST be stable after completion. Subsequent stories will be incremental improvements only.