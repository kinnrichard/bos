# Task Breakdown

> Spec: Fix New Task Text Persistence Glitch
> Total Story Points: 2
> Estimated Duration: 30 minutes

## Task List

### Task 1: Move state clearing to start of createTask function
**Story Points**: 1  
**Description**: Reorder the task creation logic to clear the input state before updating the task array.

**Implementation Steps**:
1. In `TaskList.svelte`, locate the `createTask` function
2. Move `taskCreationManager.hide(type)` to the beginning of the function
3. Store the title value before clearing
4. Add error recovery to restore text on failure

**Code Changes**:
```javascript
// Store title before clearing
const title = state.title.trim();

// Clear immediately to prevent glitch
taskCreationManager.hide(type);

try {
  // Existing task creation logic
} catch (error) {
  // Restore on error
  taskCreationManager.show(type);
  taskCreationManager.setTitle(type, title);
  // Rest of error handling
}
```

**Acceptance Criteria**:
- [ ] Input clears immediately when Enter is pressed
- [ ] No text appears in New Task row after submission
- [ ] Text is restored if creation fails

---

### Task 2: Test and verify the fix
**Story Points**: 1  
**Description**: Manually test the fix and ensure no regressions.

**Test Steps**:
1. Test normal task creation flow
2. Test rapid task creation (5+ tasks quickly)
3. Test error scenario (disconnect network)
4. Test with both Enter key and blur events

**Acceptance Criteria**:
- [ ] No visual glitches in any test scenario
- [ ] Existing functionality remains intact
- [ ] Error recovery works correctly

---

## Implementation Notes

- This is a minimal, focused fix that only changes the order of operations
- No changes to Zero.js, ActiveRecord, or data persistence
- The fix leverages Svelte's reactivity by clearing state before DOM updates
- Error recovery ensures good UX even when task creation fails

## Risk Assessment

**Low Risk** - This change only affects the UI state timing and doesn't touch:
- Data persistence layer
- Zero.js synchronization
- ActiveRecord models
- Server communication

The worst case scenario is the input doesn't clear (existing behavior), making this a safe improvement.