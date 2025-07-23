# Task Breakdown

> Spec: New Task Button Refinement
> Total Story Points: 8
> Estimated Duration: 1-2 days

## Task List

### Task 1: Add conditional positioning logic for empty lists ✅
**Story Points**: 2  
**Description**: Implement logic in TaskList.svelte to position New Task button at top when list is empty.

**Implementation Steps**:
1. Add `hasNoTasks` derived state in TaskList.svelte ✅
2. Conditionally render NewTaskRow at top when `hasNoTasks` is true ✅
3. Pass `isEmptyList` prop to NewTaskRow component ✅
4. Update NewTaskRow to accept and use `isEmptyList` prop ✅

**Acceptance Criteria**:
- [x] New Task button appears at top when task list is empty
- [x] New Task button appears at bottom when tasks exist
- [x] Button position updates correctly after adding/removing tasks

---

### Task 2: Implement desktop hover state with label hiding ✅
**Story Points**: 2  
**Description**: Add hover tracking and conditional label hiding for desktop users when tasks exist.

**Implementation Steps**:
1. Add `isHovered` state variable to NewTaskRow component ✅
2. Add mouseenter/mouseleave event handlers to track hover ✅
3. Add `hide-on-hover` class conditionally based on hover and empty list state ✅
4. Implement CSS rules to hide label on hover (desktop only) ✅

**Acceptance Criteria**:
- [x] Label hides on hover when tasks exist (desktop only)
- [x] Label remains visible on hover when list is empty
- [x] Smooth opacity transition for label hiding

---

### Task 3: Ensure mobile label persistence ✅
**Story Points**: 1  
**Description**: Add responsive CSS to ensure label always shows on mobile devices.

**Implementation Steps**:
1. Add media query for touch devices: `@media (hover: none) and (pointer: coarse)` ✅
2. Force label visibility with `!important` for mobile ✅
3. Implement `:active` state for touch feedback ✅

**Acceptance Criteria**:
- [x] Label always visible on mobile devices
- [x] Label cannot be hidden on mobile even with interaction
- [x] Touch states provide visual feedback

---

### Task 4: Implement color transitions for text and icon ✅
**Story Points**: 2  
**Description**: Add blue color transitions for both text and icon on hover/interaction.

**Implementation Steps**:
1. Update CSS to use CSS variables for color management ✅
2. Change default text color from opacity-based to color-based ✅
3. Add hover state color change to primary blue ✅
4. Implement icon switching logic based on hover state ✅
5. Add mobile :active state for color changes ✅

**Acceptance Criteria**:
- [x] Text shows in default theme color initially
- [x] Text changes to primary blue on hover (desktop)
- [x] Text changes to primary blue on touch (mobile)
- [x] Icon switches from plus-circle.svg to plus-circle-blue.svg on interaction
- [x] No animation/transition on icon switch (immediate change)

---

### Task 5: Update responsive CSS with proper media queries ✅
**Story Points**: 1  
**Description**: Refine media queries to properly differentiate desktop and mobile behaviors.

**Implementation Steps**:
1. Use `@media (hover: hover) and (pointer: fine)` for desktop-specific styles ✅
2. Use `@media (hover: none) and (pointer: coarse)` for mobile-specific styles ✅
3. Ensure no style conflicts between breakpoints ✅
4. Test on devices with hybrid input (touchscreen laptops) ✅

**Acceptance Criteria**:
- [x] Desktop hover behaviors only apply on non-touch devices
- [x] Mobile behaviors apply correctly on touch devices
- [x] Hybrid devices get appropriate experience based on input method

---

### Task 6: Write comprehensive E2E tests
**Story Points**: 2  
**Description**: Implement Playwright tests covering all new behaviors and edge cases.

**Test Coverage**:
1. Empty list positioning tests
2. Desktop hover interaction tests
3. Mobile touch interaction tests
4. Icon switching verification
5. Responsive behavior tests
6. Accessibility tests

**Acceptance Criteria**:
- [ ] All tests pass consistently
- [ ] Tests cover both desktop and mobile viewports
- [ ] Tests verify color changes and icon switches
- [ ] Tests ensure accessibility compliance

---

## Implementation Order

1. **Task 1** - Conditional positioning (foundation)
2. **Task 4** - Color transitions (visual foundation)
3. **Task 2** - Desktop hover states (builds on color work)
4. **Task 3** - Mobile persistence (responsive layer)
5. **Task 5** - Media query refinement (polish responsive behavior)
6. **Task 6** - E2E tests (validate all changes)

## Risk Mitigation

- **CSS Specificity Conflicts**: Use scoped classes and avoid `!important` except for mobile overrides
- **Browser Compatibility**: Test hover media queries on older browsers
- **Performance**: Ensure icon preloading to prevent flicker on first hover
- **Accessibility**: Maintain keyboard navigation and screen reader support

## Dependencies

- Both icon variants must be available: `/icons/plus-circle.svg` and `/icons/plus-circle-blue.svg`
- CSS variables for theme colors must be defined
- Existing task creation functionality must remain unchanged