# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-22-keyboard-navigation-popovers/spec.md

> Created: 2025-07-22
> Status: Ready for Implementation

## Tasks

- [ ] 1. Remove focus rings globally
  - [ ] 1.1 Write tests for focus ring removal
  - [ ] 1.2 Add global CSS rules to remove Melt UI focus rings
  - [ ] 1.3 Verify no focus rings appear in existing components
  - [ ] 1.4 Ensure accessibility alternatives are maintained
  - [ ] 1.5 Verify all tests pass

- [ ] 2. Create PopoverMenu component
  - [ ] 2.1 Write tests for PopoverMenu component structure
  - [ ] 2.2 Create PopoverMenu.svelte with BasePopover integration
  - [ ] 2.3 Add props for options, selection, and callbacks
  - [ ] 2.4 Implement basic rendering with PopoverOptionList
  - [ ] 2.5 Verify all tests pass

- [ ] 3. Implement keyboard navigation
  - [ ] 3.1 Write tests for keyboard navigation behavior
  - [ ] 3.2 Add highlightedIndex state management
  - [ ] 3.3 Implement arrow key handlers with wraparound
  - [ ] 3.4 Implement space/return selection handlers
  - [ ] 3.5 Sync highlighted state with mouse hover
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Add global keyboard shortcuts
  - [ ] 4.1 Write tests for global shortcut functionality
  - [ ] 4.2 Add shortcuts prop to PopoverMenu
  - [ ] 4.3 Implement global event listener management
  - [ ] 4.4 Add shortcut display with platform-specific formatting
  - [ ] 4.5 Verify all tests pass

- [ ] 5. Migrate existing popovers
  - [ ] 5.1 Write E2E tests for Job Status popover keyboard navigation
  - [ ] 5.2 Migrate JobStatusButton to use PopoverMenu
  - [ ] 5.3 Write E2E tests for Technician Assignment popover
  - [ ] 5.4 Migrate TechnicianAssignmentButton to use PopoverMenu
  - [ ] 5.5 Write E2E tests for Filter popover
  - [ ] 5.6 Migrate FilterPopover to use PopoverMenu
  - [ ] 5.7 Verify all tests pass