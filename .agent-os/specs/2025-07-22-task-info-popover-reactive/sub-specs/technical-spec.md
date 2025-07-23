# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-22-task-info-popover-reactive/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Technical Requirements

- Replace tasksService.getTaskDetails() API call with ReactiveActivityLog queries
- Replace tasksService.addNote() API call with ReactiveNote.create() mutation
- Implement real-time data synchronization using Zero.js reactive queries
- Maintain existing UI/UX while fixing broken functionality
- Ensure proper loading states and error handling
- Support offline viewing of cached data
- Implement optimistic updates for note creation

## Approach Options

**Option A:** Minimal Migration - Only replace API calls
- Pros: Fastest implementation, minimal code changes
- Cons: Doesn't fully leverage ReactiveRecord capabilities, may need refactoring later

**Option B:** Full ReactiveRecord Integration (Selected)
- Pros: Complete real-time support, cleaner code structure, better performance
- Cons: More extensive changes required, needs thorough testing

**Rationale:** Option B provides the best long-term solution by fully embracing the ReactiveRecord pattern, enabling real-time collaboration features that are core to the product's value proposition.

## Implementation Details

### ReactiveRecord Models Required

```typescript
import { ReactiveActivityLog } from '$lib/models/reactive-activity-log';
import { ReactiveNote } from '$lib/models/reactive-note';
import { ReactiveUser } from '$lib/models/reactive-user';
```

### Query Structure

```typescript
// Activity logs query
activityLogQuery = ReactiveActivityLog.where({
  loggable_type: 'Task',
  loggable_id: task.id
}).includes('user').order({ created_at: 'asc' });

// Notes query  
noteQuery = ReactiveNote.where({
  notable_type: 'Task',
  notable_id: task.id
}).includes('user').order({ created_at: 'asc' });
```

### State Management

- Use Svelte 5's `$state()` for reactive query storage
- Use `$effect()` to trigger queries when popover opens
- Leverage reactive declarations for data access
- Implement proper cleanup when popover closes

### Timeline Integration

The timeline will merge activity logs and notes into a single chronological view:
- Activity logs show task creation and status changes
- Notes display with user avatars and timestamps
- Items sorted by created_at timestamp
- User information accessed through included relations

## External Dependencies

No new external dependencies required. The implementation uses existing:
- Zero.js (already integrated)
- ReactiveRecord models (already generated)
- Existing Svelte components and utilities

## Performance Considerations

- Queries are only executed when popover is expanded
- Real-time updates only received for visible tasks
- Proper query cleanup prevents memory leaks
- Optimistic updates provide instant feedback
- Cached data enables offline viewing

## Error Handling

- Network errors display user-friendly messages
- Failed mutations rollback optimistically
- Retry logic for transient failures
- Graceful degradation for offline mode