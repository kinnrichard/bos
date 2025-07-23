# Technical Specification

> Spec: New Task Button Refinement
> Component: Technical Implementation
> Created: 2025-07-23

## Current Implementation Analysis

### Component Structure
- **NewTaskRow.svelte** - Handles new task row rendering with two modes:
  - `bottom-row`: Default position at bottom of task list
  - `inline-after-task`: Appears inline after a specific task
- **TaskList.svelte** - Renders NewTaskRow at the bottom when `canCreateTasks` is true
- **task-components.css** - Shared styles for task items including new task row

### Current Behavior
- New Task button always appears at bottom of list
- Shows plus-circle.svg icon with 0.6 opacity
- "New Task" text has 0.5 opacity, increases to 1 on hover
- No color changes on interaction
- Same behavior on desktop and mobile

## Required Changes

### 1. Conditional Positioning Logic

**TaskList.svelte modifications:**
```svelte
// Add derived state to check if task list is empty
const hasNoTasks = $derived(renderableTaskItems.length === 0);

// Conditionally render NewTaskRow at top or bottom
{#if canCreateTasks && hasNoTasks}
  <!-- Render at top when no tasks -->
  <NewTaskRow 
    mode="bottom-row"
    isEmptyList={true}
    ... />
{/if}

<!-- Task items -->

{#if canCreateTasks && !hasNoTasks}
  <!-- Render at bottom when tasks exist -->
  <NewTaskRow 
    mode="bottom-row"
    isEmptyList={false}
    ... />
{/if}
```

### 2. Component Props Update

**NewTaskRow.svelte props:**
```typescript
let {
  mode = 'bottom-row',
  depth = 0,
  manager,
  taskState,
  onStateChange,
  isEmptyList = false  // New prop
}: {
  mode?: 'bottom-row' | 'inline-after-task';
  depth?: number;
  manager: TaskInputManager;
  taskState?: TaskCreationState;
  onStateChange?: (changes: Partial<TaskCreationState>) => void;
  isEmptyList?: boolean;  // New prop
} = $props();
```

### 3. Hover State Implementation

**NewTaskRow.svelte template updates:**
```svelte
<!-- Add hover state tracking -->
let isHovered = $state(false);

<div 
  class="task-item task-item-add-new"
  class:is-empty-list={isEmptyList}
  class:is-hovered={isHovered}
  style="--depth: {depth}"
  onclick={handleRowClick}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  data-testid={mode === 'bottom-row' ? 'create-task-button' : undefined}
>
  <!-- Update icon source based on hover -->
  <img 
    src={isHovered ? '/icons/plus-circle-blue.svg' : '/icons/plus-circle.svg'}
    alt="Add task" 
    style="width: 16px; height: 16px; {mode === 'bottom-row' ? 'pointer-events: none;' : ''}" 
  />
  
  <!-- Update text visibility and color -->
  {#if !isShowing && mode === 'bottom-row'}
    <h5 
      class="task-title add-task-placeholder"
      class:hide-on-hover={!isEmptyList && isHovered}
      onclick={handleShowTask}
    >
      New Task
    </h5>
  {/if}
</div>
```

### 4. CSS Modifications

**task-components.css additions:**
```css
/* Base styles for new task row */
.task-item-add-new {
  --text-color: var(--text-secondary, #8E8E93);
}

/* Hover state for desktop */
@media (hover: hover) and (pointer: fine) {
  .task-item-add-new:hover {
    --text-color: var(--accent-blue, #007AFF);
  }
  
  .task-item-add-new:hover .add-task-placeholder {
    color: var(--text-color);
  }
  
  /* Hide label on hover when list has tasks (desktop only) */
  .task-item-add-new:not(.is-empty-list):hover .add-task-placeholder.hide-on-hover {
    opacity: 0;
    pointer-events: none;
  }
}

/* Mobile styles - always show label */
@media (hover: none) and (pointer: coarse) {
  .task-item-add-new .add-task-placeholder {
    opacity: 1 !important;
    display: block !important;
  }
  
  /* Color change on touch */
  .task-item-add-new:active {
    --text-color: var(--accent-blue, #007AFF);
  }
  
  .task-item-add-new:active .add-task-placeholder {
    color: var(--text-color);
  }
}

/* Default text color */
.add-task-placeholder {
  color: var(--text-color);
  transition: opacity 0.15s ease, color 0.15s ease;
}

/* Remove default opacity styling */
.add-task-placeholder {
  opacity: 1;
}

/* Icon opacity adjustment */
.task-item-add-new .status-emoji img {
  opacity: 0.8;
}

.task-item-add-new:hover .status-emoji img,
.task-item-add-new:active .status-emoji img {
  opacity: 1;
}
```

### 5. Responsive Behavior Strategy

**Media Query Breakpoints:**
- Desktop: `@media (hover: hover) and (pointer: fine)`
  - Hide label on hover when tasks exist
  - Show blue color on hover
  - Icon switches to blue variant
  
- Mobile/Tablet: `@media (hover: none) and (pointer: coarse)`
  - Always show label
  - Blue color on touch/active state
  - Icon switches to blue variant on touch

## Implementation Notes

1. **Performance**: Use CSS-only hover states to avoid JavaScript overhead
2. **Accessibility**: Maintain keyboard navigation support and ARIA attributes
3. **Browser Compatibility**: Test hover media queries across browsers
4. **Theme Support**: Use CSS variables for colors to support dark/light themes
5. **Transition Timing**: No animation on icon switch as requested
6. **Touch Targets**: Ensure 44x44px minimum touch target on mobile