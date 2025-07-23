# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-22-keyboard-navigation-popovers/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Technical Requirements

- Remove all focus rings by overriding Melt UI's default focus styles
- Implement keyboard event handling for arrow keys, space, and return
- Track highlighted index state that syncs with mouse hover
- Support wraparound navigation when reaching list boundaries
- Enable global keyboard shortcuts that work outside popover context
- Ensure keyboard navigation works with dynamic/filtered lists
- Maintain accessibility for screen readers while removing visual focus rings

## Approach Options

**Option A:** Modify BasePopover to handle all keyboard navigation
- Pros: Centralized logic, consistent behavior
- Cons: BasePopover would need to know about child structure, tight coupling

**Option B:** Create a new PopoverMenu component that wraps PopoverOptionList (Selected)
- Pros: Clean separation of concerns, reusable, maintains BasePopover simplicity
- Cons: Requires updating existing popover implementations

**Rationale:** Option B provides better modularity and allows BasePopover to remain a simple positioning component while PopoverMenu handles the menu-specific keyboard navigation logic.

## Implementation Details

### Focus Ring Removal
- Add global CSS rule to override Melt UI's focus-visible styles
- Use `outline: none` with proper contrast alternatives for accessibility

### PopoverMenu Component
- New component that combines BasePopover with PopoverOptionList
- Manages keyboard navigation state and event handlers
- Provides slots/props for global shortcuts
- Syncs highlighted state between mouse and keyboard

### Keyboard Navigation State
- Track `highlightedIndex` state in PopoverMenu
- Mouse hover updates highlightedIndex
- Arrow keys increment/decrement with wraparound
- Space/Return triggers click on highlighted item

### Global Shortcuts
- Accept optional `shortcuts` prop on PopoverMenu
- Register/unregister global listeners on mount/unmount
- Display shortcuts right-aligned using CSS grid or flexbox
- Format shortcuts using platform-appropriate symbols (⌘ on Mac, Ctrl on Windows)

## External Dependencies

No new external dependencies required. The implementation will use:
- Existing Melt UI for base popover functionality
- Svelte's built-in event handling and reactivity
- Native keyboard event APIs