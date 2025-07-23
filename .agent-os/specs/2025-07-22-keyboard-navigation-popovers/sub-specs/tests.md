# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-22-keyboard-navigation-popovers/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Test Coverage

### Unit Tests

**PopoverMenu Component**
- Keyboard event handlers correctly update highlightedIndex
- Wraparound logic works at list boundaries
- Space/Return key triggers correct callbacks
- Global shortcut registration/cleanup lifecycle
- Highlighted state syncs with mouse hover

**CSS/Styling**
- Focus rings are properly removed
- Highlight styles apply to correct index
- Shortcut display formatting is correct

### Integration Tests

**Keyboard Navigation Flow**
- Open popover → press down arrow → first item highlights
- Open popover → press up arrow → last item highlights
- Navigate with arrows → press space → correct item selected
- Navigate with arrows → press return → correct item selected
- Mouse hover → arrow key → navigation continues from hovered item

**Global Shortcuts**
- Shortcut triggers action when popover is closed
- Shortcut triggers action when popover is open
- Multiple shortcuts don't conflict
- Shortcuts are cleaned up when component unmounts

### E2E Tests (Playwright)

**Job Status Popover**
- Full keyboard navigation flow from opening to selection
- Verify status changes persist after keyboard selection

**Technician Assignment Popover**
- Navigate and assign technician using only keyboard
- Verify assignment updates in real-time

**Filter Popover**
- Navigate and toggle filters using keyboard
- Verify filter state updates correctly

### Mocking Requirements

- **Keyboard Events:** Mock keyboard event objects with proper key codes
- **Global Event Listeners:** Spy on addEventListener/removeEventListener
- **Platform Detection:** Mock navigator.platform for shortcut formatting tests