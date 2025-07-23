# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-22-task-info-popover-reactive/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Test Coverage

### Unit Tests

**TaskInfoPopover Component**
- Renders loading state while queries are pending
- Displays activity logs when data is loaded
- Displays notes with user information
- Shows timer for in-progress tasks
- Handles empty states gracefully
- Updates when reactive data changes

**Timeline Utilities**
- Correctly merges activity logs and notes
- Sorts items by timestamp
- Formats dates appropriately
- Handles missing user data

### Integration Tests

**ReactiveRecord Integration**
- Queries execute when popover expands
- Queries include user relations
- Data updates when backend changes
- Queries are cleaned up on close

**Note Creation Flow**
- Note text validation works correctly
- Create mutation is called with correct data
- Optimistic update shows note immediately
- Error handling rolls back failed creates
- Note count updates on task card

### Feature Tests

**Real-time Collaboration**
- Open popover in two browser windows
- Add note in window A
- Note appears in window B without refresh
- Status changes reflect immediately
- Activity counts update in real-time

**Offline Support**
- View cached data when offline
- Queue note creation when offline
- Sync queued notes when reconnected
- Handle conflicts appropriately

## Mocking Requirements

**Zero.js Mocking**
- Mock ReactiveRecord query responses
- Mock real-time update events
- Mock mutation success/failure
- Mock offline queue behavior

**User Context**
- Mock authenticated user for note creation
- Mock user data for activity display

## Test Implementation Examples

### Playwright Test - Real-time Updates

```javascript
test('displays notes in real-time across browsers', async ({ page, context }) => {
  // Open task popover in first browser
  await page.goto('/jobs/1/tasks');
  await page.click('[data-task-id="1"]');
  await page.waitForSelector('.task-info-popover');
  
  // Open same popover in second browser
  const page2 = await context.newPage();
  await page2.goto('/jobs/1/tasks');
  await page2.click('[data-task-id="1"]');
  await page2.waitForSelector('.task-info-popover');
  
  // Add note in first browser
  await page.fill('textarea[placeholder="Add a note..."]', 'Test note');
  await page.press('textarea', 'Enter');
  
  // Verify note appears in second browser
  await expect(page2.locator('text=Test note')).toBeVisible();
});
```

### Vitest Test - Query Lifecycle

```javascript
test('executes queries when popover opens', () => {
  const { getByRole, queryByText } = render(TaskInfoPopover, {
    props: { task: mockTask, jobId: 1 }
  });
  
  // Initially no queries
  expect(ReactiveActivityLog.where).not.toHaveBeenCalled();
  
  // Expand popover
  fireEvent.click(getByRole('button'));
  
  // Verify queries executed
  expect(ReactiveActivityLog.where).toHaveBeenCalledWith({
    loggable_type: 'Task',
    loggable_id: mockTask.id
  });
});
```

## Performance Testing

- Measure query execution time
- Test with 100+ activity logs
- Verify smooth scrolling performance
- Check memory usage over time
- Monitor WebSocket message frequency