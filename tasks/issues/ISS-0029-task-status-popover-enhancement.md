# Issue: Enhanced Task Status Selection with Popover

## Description
Replace the current 3-status cycling behavior of task status emoji clicks with an intelligent popover-based selection system that provides access to all task statuses while maintaining quick single-click functionality.

## Current Behavior
- Single click on task status emoji cycles through: `new_task` → `in_progress` → `successfully_completed`
- Missing access to `paused` and `cancelled` statuses
- No click debouncing or completed status protection

## Enhanced Behavior Requirements

### Click Detection Logic
1. **Single Click (< 1000ms gap)**: Continue current cycling behavior for quick changes
2. **Double Click (> 1 click within 1000ms)**: Open status selection popover  
3. **Completed Status Protection**: If current status is `successfully_completed`, always open popover (never cycle)

### Popover Implementation
- **Origin**: Popover opens from the task status emoji button
- **Content**: All 5 available task statuses with emojis and labels
- **Pattern**: Follow existing popover patterns (BasePopover + PopoverMenu)
- **Styling**: Consistent with job status/priority popovers

## Technical Implementation

### 1. Click Debouncing System
```typescript
let clickCount = 0;
let clickTimer: number | null = null;

function handleStatusClick(event: MouseEvent) {
  clickCount++;
  
  if (clickTimer) {
    clearTimeout(clickTimer);
  }
  
  clickTimer = setTimeout(() => {
    if (clickCount === 1 && task.status !== 'successfully_completed') {
      // Single click - cycle through statuses
      handleQuickStatusCycle();
    } else {
      // Multiple clicks or completed status - show popover
      openStatusPopover();
    }
    clickCount = 0;
    clickTimer = null;
  }, 1000);
}
```

### 2. Status Selection Options
```typescript
const allTaskStatuses = [
  { id: 'title', value: 'title', label: 'Task Status', header: true },
  { id: 'new_task', value: 'new_task', label: 'New Task', icon: '⚫️' },
  { id: 'in_progress', value: 'in_progress', label: 'In Progress', icon: '🟢' },
  { id: 'paused', value: 'paused', label: 'Paused', icon: '⏸️' },
  { id: 'successfully_completed', value: 'successfully_completed', label: 'Completed', icon: '☑️' },
  { id: 'cancelled', value: 'cancelled', label: 'Cancelled', icon: '❌' },
];
```

### 3. Component Structure
- **TaskRow.svelte**: Add popover state and click handling logic
- **TaskStatusPopover.svelte**: New component following JobStatusButton pattern
- **BasePopover + PopoverMenu**: Reuse existing popover infrastructure

## Files to Modify

### Core Implementation
- `frontend/src/lib/components/tasks/TaskRow.svelte`
  - Replace `handleStatusChange` with debounced click system
  - Add popover state management
  - Integrate TaskStatusPopover component

### New Component  
- `frontend/src/lib/components/tasks/TaskStatusPopover.svelte`
  - Follow JobStatusButton/JobPriorityButton pattern
  - Use BasePopover + PopoverMenu
  - Handle all 5 task status options

### Integration Points
- Import and use existing emoji mappings from `$lib/config/emoji`
- Use shared popover styling from `$lib/styles/popover-common.css`
- Dispatch events through existing `taskaction` system

## Acceptance Criteria

### Functionality
- [ ] Single click (< 1000ms gap) cycles through quick statuses for non-completed tasks
- [ ] Multiple clicks (≥ 2 within 1000ms) opens popover for all statuses  
- [ ] Completed tasks always open popover (never cycle)
- [ ] All 5 task statuses accessible via popover
- [ ] Popover closes properly without interfering with other UI

### User Experience  
- [ ] No regression in quick status change workflow
- [ ] Popover provides clear visual feedback
- [ ] Consistent styling with other popovers
- [ ] Proper click event handling (no bubbling/selection conflicts)

### Technical
- [ ] Follows existing TaskRow event dispatch patterns
- [ ] Uses shared popover components and styling
- [ ] Proper cleanup of timers and event listeners
- [ ] No memory leaks from click debouncing

## Benefits
- **Enhanced Access**: All task statuses become accessible
- **Improved UX**: Protects completed tasks from accidental changes  
- **Consistent Interface**: Matches job status/priority popover patterns
- **Backward Compatible**: Preserves quick single-click workflow
- **Future Proof**: Extensible for additional task statuses

## Testing Considerations
- Click timing and debouncing edge cases
- Completed task protection behavior
- Popover positioning and z-index conflicts
- Event propagation and row selection interaction
- All status transitions work correctly
- Mobile/touch compatibility