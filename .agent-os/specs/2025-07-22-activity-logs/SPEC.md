# Activity Logs Implementation Spec

**Feature Name:** Activity Logs System  
**Feature Type:** Core Feature  
**Created:** 2025-07-22  
**Status:** Proposed  
**Epic Size:** Large  

## Summary

Implement a comprehensive activity logging system in the Svelte front-end that matches the functionality of the deprecated Rails monolith, providing both system-wide and client-specific activity views with real-time updates via ReactiveRecord.

## Motivation

### Problem Statement

Currently, there's no way to view historical activity in the new Svelte front-end. Users need visibility into:
- Who performed what actions and when
- Client and job-specific activity history
- System-wide activity for compliance and auditing
- Real-time updates as activities occur

### Expected Benefits

- **Audit Trail**: Complete visibility into all system actions for compliance
- **Troubleshooting**: Quickly understand what happened and when
- **Accountability**: Clear attribution of actions to specific users
- **Client History**: Easy access to all interactions with a specific client
- **Real-time Awareness**: Instant visibility when team members make changes

## Detailed Specifications

### 1. Data Architecture

#### Activity Log Model Extension
The `ReactiveActivityLog` model already exists (generated via Rails generator). We need to extend it with computed properties:

```typescript
// frontend/src/lib/models/extensions/activity-log-extensions.ts
import { ReactiveActivityLog } from '../reactive-activity-log';
import { getClientTypeEmoji } from '$lib/config/emoji';

// Extend the ReactiveActivityLog prototype with computed properties
Object.defineProperties(ReactiveActivityLog.prototype, {
  userInitials: {
    get() {
      return this.user?.initials || 'S';
    }
  },
  
  userAvatarStyle: {
    get() {
      return this.user?.avatar_style || 'gray';
    }
  },
  
  formattedMessage: {
    get() {
      return this.message || '';
    }
  },
  
  loggableEmoji: {
    get() {
      return this.getEntityEmoji();
    }
  },
  
  isLinkable: {
    get() {
      return this.action !== 'deleted' && !!this.loggable_id;
    }
  },
  
  loggablePath: {
    get() {
      if (!this.isLinkable) return null;
      
      switch (this.loggable_type) {
        case 'Client':
          return `/clients/${this.loggable_id}`;
        case 'Job':
          return this.client_id && this.job_id 
            ? `/clients/${this.client_id}/jobs/${this.job_id}`
            : `/jobs/${this.loggable_id}`;
        case 'Task':
          return `/tasks/${this.loggable_id}`;
        case 'Person':
          return `/people/${this.loggable_id}`;
        default:
          return null;
      }
    }
  }
});

// Add method to prototype
ReactiveActivityLog.prototype.getEntityEmoji = function() {
  switch (this.loggable_type) {
    case 'Client':
      return this.client?.client_type === 'business' ? '🏢' : '🏠';
    case 'Job':
      return '💼';
    case 'Task':
      return '📋';
    case 'Person':
      return '👤';
    default:
      return '📝';
  }
};
```

### 2. Component Architecture

#### Core Components

```
src/lib/components/logs/
├── ActivityLogList.svelte          # Main container
├── ActivityLogGroup.svelte         # Collapsible context groups
├── ActivityLogRow.svelte           # Individual log entry
├── ActivityLogDateHeader.svelte   # Date separators
├── ActivityLogFilters.svelte      # Filter controls (future)
├── ActivityLogEmpty.svelte         # Empty state
└── EntityEmoji.svelte              # Reusable emoji component
```

#### Component Features

**ActivityLogList.svelte**
- Uses ReactiveActivityLog subscription for real-time updates
- Groups logs by context (client/job combinations)
- Handles pagination by date (not by number of entries)
- Provides infinite scroll or load more functionality

**ActivityLogGroup.svelte**
- Collapsible header with chevron animation
- Shows client/job context with EntityEmoji component
- Displays count of logs in group
- Does NOT persist collapse state across sessions

**ActivityLogRow.svelte**
- Uses existing UserAvatar component from `$lib/components/ui/UserAvatar.svelte`
- Formatted message with entity links
- Timestamp with browser's native tooltip (title attribute) for full date
- Grouping indicator for duplicate actions

**EntityEmoji.svelte**
- New component similar to emoji helpers in `$lib/config/emoji.ts`
- Supports all entity types (Client, Job, Task, Person, etc.)
- Consistent emoji display across the app

### 3. Views Implementation

#### System-Wide Activity Log (`/logs`)

```svelte
<!-- src/routes/(authenticated)/logs/+page.svelte -->
<script>
  import { ActivityLogList } from '$lib/components/logs'
  import { ReactiveActivityLog } from '$lib/models/reactive-activity-log'
  import '$lib/models/extensions/activity-log-extensions' // Load extensions
  
  // ReactiveRecord handles subscriptions internally
  const logsQuery = ReactiveActivityLog
    .includes(['user', 'client', 'job'])
    .orderBy('created_at', 'desc')
    .where('action != ? OR metadata->\'changes\' IS NULL OR jsonb_object_keys(metadata->\'changes\') != \'{position}\'', 'updated')
    .limit(500)
    .all();
</script>

<div class="page-container">
  <h1>Activity Logs</h1>
  
  {#if logsQuery.isLoading}
    <div>Loading...</div>
  {:else if logsQuery.error}
    <div>Error: {logsQuery.error.message}</div>
  {:else}
    <ActivityLogList logs={logsQuery.data} />
  {/if}
</div>
```

#### Client-Specific Logs (`/clients/[id]/logs`)

```svelte
<!-- src/routes/(authenticated)/clients/[id]/logs/+page.svelte -->
<script>
  import { page } from '$app/stores'
  import { ActivityLogList } from '$lib/components/logs'
  import { ReactiveActivityLog } from '$lib/models/reactive-activity-log'
  import { ReactiveClient } from '$lib/models/reactive-client'
  import '$lib/models/extensions/activity-log-extensions' // Load extensions
  
  $: clientId = $page.params.id;
  
  // Get client
  $: clientQuery = ReactiveClient.find(clientId);
  
  // Get client-specific logs
  $: logsQuery = ReactiveActivityLog
    .includes(['user', 'client', 'job'])
    .where({ client_id: clientId })
    .orderBy('created_at', 'desc')
    .limit(500)
    .all();
</script>

<div class="page-container">
  {#if clientQuery.data}
    <h1>Activity Log for {clientQuery.data.name}</h1>
  {/if}
  
  {#if logsQuery.isLoading}
    <div>Loading...</div>
  {:else if logsQuery.error}
    <div>Error: {logsQuery.error.message}</div>
  {:else}
    <ActivityLogList logs={logsQuery.data} context="client" />
  {/if}
</div>
```

### 4. Grouping & Organization Logic

#### Context Grouping Algorithm
```typescript
interface LogGroup {
  key: string
  type: 'general' | 'client' | 'job' | 'cross-reference'
  client?: Client
  job?: Job
  logs: ActivityLog[]
  isCollapsed: boolean
}

function groupLogsByContext(logs: ActivityLog[]): LogGroup[] {
  // Group by client-job combination
  // Separate general logs (no client/job)
  // Handle cross-references appropriately
  // Sort groups by client name, then job title
}
```

#### Date Grouping Within Context
```typescript
function groupLogsByDate(logs: ActivityLog[]): Map<string, ActivityLog[]> {
  // Group logs by date within each context group
  // Format dates appropriately (Today, Yesterday, date)
}
```

#### Duplicate Action Grouping
```typescript
interface GroupedLog {
  representative: ActivityLog
  logs: ActivityLog[]
  count: number
}

function groupIdenticalLogs(logs: ActivityLog[]): GroupedLog[] {
  // Group consecutive identical actions by same user
  // Show count badge for multiple occurrences
}
```

### 5. Real-time Updates

ReactiveRecord handles all real-time subscriptions and updates automatically via Zero.js. The reactive queries will automatically update the UI when new logs are added or existing logs are modified.

### 6. UI/UX Requirements

#### Visual Design
- Match existing Tailwind design system
- Maintain visual hierarchy with proper spacing
- Use consistent color scheme for different log types
- Smooth animations for expand/collapse
- Responsive design for mobile devices

#### Interactive Elements
- Click to expand/collapse groups
- Hover states for interactive elements
- Links to entities (clients, jobs, tasks)
- Browser's native tooltip (title attribute) for full timestamp on hover
- Smooth scroll to today's logs

#### Performance
- Virtual scrolling for large log lists
- Lazy load older logs on demand
- Debounce real-time updates to prevent UI thrashing
- Local caching handled by Zero.js/ReactiveRecord

### 7. API Requirements

The existing Rails API already provides:
- `GET /api/v1/logs` - System-wide logs
- `GET /api/v1/clients/:id/logs` - Client-specific logs

ReactiveRecord will handle real-time synchronization via Zero.js.

## Technical Constraints

1. **Performance**: Must handle 500+ logs without UI lag
2. **Real-time**: Updates must appear within 1 second
3. **Mobile**: Full functionality on mobile devices
4. **Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)
5. **Accessibility**: WCAG 2.1 AA compliant

## Task Breakdown

### Phase 1: Core Infrastructure (1 day)
- [ ] Create activity log extensions file with computed properties
- [ ] Add EntityEmoji component for consistent emoji display
- [ ] Set up base component structure
- [ ] Add routing for /logs and /clients/[id]/logs

### Phase 2: Component Implementation (3 days)
- [ ] Build ActivityLogList container component
- [ ] Implement ActivityLogGroup with collapse functionality
- [ ] Create ActivityLogRow using UserAvatar component
- [ ] Add ActivityLogDateHeader for date grouping
- [ ] Implement empty states

### Phase 3: Grouping Logic (2 days)
- [ ] Implement context grouping algorithm
- [ ] Add date grouping within contexts
- [ ] Create duplicate action detection and grouping
- [ ] Add sorting and filtering logic

### Phase 4: Real-time Features (1 day)
- [ ] Set up ReactiveRecord queries with proper includes
- [ ] Implement real-time log insertion animations
- [ ] Add smooth transitions for new entries

### Phase 5: UI Polish & Performance (2 days)
- [ ] Add expand/collapse animations
- [ ] Implement virtual scrolling for large lists
- [ ] Add loading states and skeletons
- [ ] Optimize re-renders and performance
- [ ] Mobile responsive adjustments

### Phase 6: Testing & Edge Cases (1 day)
- [ ] Add Playwright E2E tests
- [ ] Test real-time update scenarios
- [ ] Handle edge cases (deleted entities, missing users)
- [ ] Performance testing with large datasets
- [ ] Cross-browser testing

**Total Estimated Time**: 10 days

## Success Criteria

1. **Feature Parity**: All functionality from Rails monolith is replicated
2. **Performance**: Page loads in <2 seconds with 500 logs
3. **Real-time**: Updates appear within 1 second of action
4. **Mobile**: Full functionality on mobile devices
5. **Testing**: 100% E2E test coverage for critical paths

## Dependencies

- Existing ReactiveActivityLog model (already generated)
- UserAvatar component
- Emoji configuration system
- User authentication and permissions
- Tailwind CSS design system

## Open Questions (Answered)

1. **Should we implement infinite scroll or pagination?** 
   - Answer: Pagination by date, not by number of entries

2. **How long should logs be retained?**
   - Answer: Unlimited retention

3. **Should collapsed state persist across sessions?**
   - Answer: No

4. **Do we need export functionality for logs?**
   - Answer: No

5. **Should we add advanced filtering?**
   - Answer: Not right now, in the future

## Future Enhancements

1. **Advanced Filtering**: Filter by user, action type, date range
2. **Export**: Download logs as CSV/PDF
3. **Notifications**: Real-time notifications for specific events
4. **Analytics**: Activity dashboards and reports
5. **Webhooks**: External integrations for activity events